const test = require('node:test');
const assert = require('node:assert/strict');
const { createAnalysisService } = require('../src/services/analysisService');
const { createFakeSupabase } = require('./helpers/fakeSupabase');
const { AppError } = require('../src/utils/errors');

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse('2026-10-07T00:00:00Z');
const YT_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
const RD_URL = 'https://www.reddit.com/r/techsupport/comments/abc123/x/';

function ytComments(n) {
  return Array.from({ length: n }, (_, i) => ({ id: `yc${i}`, video_id: 'dQw4w9WgXcQ', author_name: `a${i}`, author_profile_image: null, text: `t${i}`, like_count: i, published_at: '2026-01-01T00:00:00Z' }));
}

function setup({ db = createFakeSupabase(), comments = ytComments(3), reddit, ai } = {}) {
  const counts = { details: 0, comments: 0, classify: 0, summary: 0 };
  const youtube = {
    async fetchVideoDetails(id) { counts.details++; await new Promise((r) => setTimeout(r, 5)); return { id, title: 'T', channel_title: 'C', thumbnail: 'u', published_at: 'd' }; },
    async fetchComments() { counts.comments++; return comments; },
  };
  const defaultAi = {
    async classifyComments(list) { counts.classify++; return list.map((c) => ({ id: c.id, sentiment: 'Positive', category: 'Praise' })); },
    async generateVideoSummary() { counts.summary++; return '### Summary'; },
    async generateRedditSummary(title, list) { counts.summary++; counts.redditList = list; return '### Reddit summary'; },
  };
  const svc = createAnalysisService({ supabase: db, youtube, reddit, ai: ai || defaultAi, ttlMs: 7 * DAY, now: () => NOW });
  return { svc, db, counts };
}

test('analyzes a YouTube video, stores it, and serves the second request from cache', async () => {
  const { svc, db, counts } = setup();
  const first = await svc.analyze(YT_URL);
  assert.equal(first.cached, false);
  assert.equal(first.video.summary, '### Summary');
  assert.equal(first.comments.length, 3);
  assert.deepEqual([first.comments[0].sentiment, first.comments[0].category], ['Positive', 'Praise']);
  assert.equal(db.tables.videos.length, 1);
  assert.equal(db.tables.comments.length, 3);

  const second = await svc.analyze(YT_URL);
  assert.equal(second.cached, true);
  assert.equal(counts.details, 1);
  assert.equal(counts.classify, 1);
});

test('invalid URLs are a 400 and nothing is called', async () => {
  const { svc, counts } = setup();
  await assert.rejects(svc.analyze('https://example.com/x'), (e) => e instanceof AppError && e.status === 400);
  assert.equal(counts.details, 0);
});

test('Reddit: ids and parent ids share one prefixed id space, and parent_id is never stored', async () => {
  const reddit = {
    async fetchRedditThread() {
      return {
        postDetails: { id: 'abc123', title: 'PC flickers', channel_title: 'r/techsupport', thumbnail: 't', published_at: null },
        comments: [
          { id: 'a1', author_name: 'alice', author_profile_image: null, text: 'Update the driver', like_count: 5, published_at: null, parent_id: null },
          { id: 'b1', author_name: 'bob', author_profile_image: null, text: 'Worked', like_count: 1, published_at: null, parent_id: 'a1' },
        ],
      };
    },
  };
  const { svc, db, counts } = setup({ reddit });
  const out = await svc.analyze(RD_URL);

  assert.equal(out.video.id, 'reddit_abc123');
  const ids = counts.redditList.map((c) => c.id);
  assert.deepEqual(ids, ['reddit_c_a1', 'reddit_c_b1']);
  assert.equal(counts.redditList[1].parent_id, 'reddit_c_a1'); // parent resolvable inside the summary input
  assert.ok(ids.includes(counts.redditList[1].parent_id));
  assert.ok(db.tables.comments.every((c) => !('parent_id' in c) && c.video_id === 'reddit_abc123'));
  assert.ok(out.comments.every((c) => !('parent_id' in c)));
});

test('a stale cached record is discarded and re-analysed', async () => {
  const db = createFakeSupabase({
    videos: [{ id: 'dQw4w9WgXcQ', title: 'old', summary: '### old', created_at: new Date(NOW - 8 * DAY).toISOString() }],
    comments: ytComments(3).map((c) => ({ ...c, sentiment: 'Positive', category: 'Praise' })),
  });
  const { svc, counts } = setup({ db });
  const out = await svc.analyze(YT_URL);
  assert.equal(out.cached, false);
  assert.equal(counts.details, 1);
  assert.equal(out.video.title, 'T');
});

test('legacy corrupted cache (12 comments, all Neutral/Noise) is healed by re-analysis', async () => {
  const db = createFakeSupabase({
    videos: [{ id: 'dQw4w9WgXcQ', title: 'old', summary: '### fine', created_at: new Date(NOW - DAY).toISOString() }],
    comments: ytComments(12).map((c) => ({ ...c, sentiment: 'Neutral', category: 'Noise' })),
  });
  const { svc, counts } = setup({ db, comments: ytComments(3) });
  const out = await svc.analyze(YT_URL);
  assert.equal(out.cached, false);
  assert.equal(counts.classify, 1);
  assert.equal(db.tables.comments.length, 3);
});

test('AI failure stores nothing and surfaces the AppError', async () => {
  const ai = {
    async classifyComments() { throw new AppError(502, 'The AI service is unavailable right now. Please try again in a minute.'); },
    async generateVideoSummary() { throw new Error('unreachable'); },
  };
  const { svc, db } = setup({ ai });
  await assert.rejects(svc.analyze(YT_URL), (e) => e.status === 502);
  assert.equal(db.tables.videos.length, 0);
  assert.equal(db.tables.comments.length, 0);
});

test('a failed comment write rolls the video row back (no half-saved analysis)', async () => {
  const db = createFakeSupabase();
  db.failOn.add('comments:upsert');
  const { svc } = setup({ db });
  await assert.rejects(svc.analyze(YT_URL), (e) => e.status === 503);
  assert.equal(db.tables.videos.length, 0);
});

test('database unreachable on read is a 503', async () => {
  const db = createFakeSupabase();
  db.failOn.add('videos:select');
  const { svc, counts } = setup({ db });
  await assert.rejects(svc.analyze(YT_URL), (e) => e instanceof AppError && e.status === 503);
  assert.equal(counts.details, 0);
});

test('concurrent identical requests share a single analysis (double-submit safe)', async () => {
  const { svc, counts } = setup();
  const [a, b, c] = await Promise.all([svc.analyze(YT_URL), svc.analyze(YT_URL), svc.analyze(`${YT_URL}&t=5s`)]);
  assert.equal(counts.details, 1);
  assert.equal(counts.classify, 1);
  assert.equal(a.video.id, b.video.id);
  assert.equal(c.video.id, 'dQw4w9WgXcQ');
});

test('after a failure the in-flight slot is released so a retry works', async () => {
  let fail = true;
  const ai = {
    async classifyComments(list) { if (fail) throw new AppError(502, 'x'); return list.map((c) => ({ id: c.id, sentiment: 'Positive', category: 'Praise' })); },
    async generateVideoSummary() { return '### ok'; },
  };
  const { svc } = setup({ ai });
  await assert.rejects(svc.analyze(YT_URL));
  fail = false;
  assert.equal((await svc.analyze(YT_URL)).cached, false);
});

test('a video with no comments is saved with the fixed fallback summary and skips the AI', async () => {
  const { svc, db, counts } = setup({ comments: [] });
  const out = await svc.analyze(YT_URL);
  assert.equal(out.video.summary, 'This video has no comments to analyze.');
  assert.deepEqual(out.comments, []);
  assert.equal(counts.classify, 0);
  assert.equal(db.tables.videos.length, 1);
  // ...and that record is a valid cache hit next time
  assert.equal((await svc.analyze(YT_URL)).cached, true);
});

test('duplicate comment ids from the source are collapsed', async () => {
  const dup = [...ytComments(2), ...ytComments(2)];
  const { svc } = setup({ comments: dup });
  assert.equal((await svc.analyze(YT_URL)).comments.length, 2);
});

test('a stale record is kept when re-analysis fails (no data loss during an AI outage)', async () => {
  const db = createFakeSupabase({
    videos: [{ id: 'dQw4w9WgXcQ', title: 'old', summary: '### old', created_at: new Date(NOW - 8 * DAY).toISOString() }],
    comments: ytComments(3).map((c) => ({ ...c, sentiment: 'Positive', category: 'Praise' })),
  });
  const ai = {
    async classifyComments() { throw new AppError(502, 'The AI service is unavailable right now. Please try again in a minute.'); },
    async generateVideoSummary() { return 'x'; },
  };
  const { svc } = setup({ db, ai });
  await assert.rejects(svc.analyze(YT_URL), (e) => e.status === 502);
  assert.equal(db.tables.videos.length, 1);
  assert.equal(db.tables.videos[0].title, 'old');
  assert.equal(db.tables.comments.length, 3);
});

test('re-analysing a stale record replaces its comments instead of mixing old and new', async () => {
  const db = createFakeSupabase({
    videos: [{ id: 'dQw4w9WgXcQ', title: 'old', summary: '### old', created_at: new Date(NOW - 8 * DAY).toISOString() }],
    comments: [{ id: 'old1', video_id: 'dQw4w9WgXcQ', sentiment: 'Positive', category: 'Praise' }],
  });
  const { svc } = setup({ db });
  await svc.analyze(YT_URL);
  assert.deepEqual(db.tables.comments.map((c) => c.id).sort(), ['yc0', 'yc1', 'yc2']);
});

test('a write that fails midway through the comment batches leaves nothing behind (no FK cascade needed)', async () => {
  const db = createFakeSupabase();
  db.failOnCall.set('comments:upsert', 2); // 600 comments = 2 batches of 500; the second fails
  const { svc } = setup({ db, comments: ytComments(600) });
  await assert.rejects(svc.analyze(YT_URL), (e) => e.status === 503);
  assert.equal(db.tables.videos.length, 0);
  assert.equal(db.tables.comments.length, 0);
});
