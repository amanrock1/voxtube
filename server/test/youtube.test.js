const test = require('node:test');
const assert = require('node:assert/strict');
const { extractVideoId, createYoutubeService } = require('../src/services/youtubeService');
const { AppError } = require('../src/utils/errors');

const ID = 'dQw4w9WgXcQ';

test('extractVideoId handles real-world URL variants', () => {
  const good = [
    `https://www.youtube.com/watch?v=${ID}`,
    `https://youtube.com/watch?v=${ID}&t=42s`,
    `https://m.youtube.com/watch?v=${ID}`,
    `https://music.youtube.com/watch?v=${ID}`,
    `https://youtu.be/${ID}`,
    `https://youtu.be/${ID}?si=abc123`,
    `https://www.youtube.com/shorts/${ID}`,
    `https://www.youtube.com/embed/${ID}`,
    `https://www.youtube.com/live/${ID}?feature=share`,
    `youtube.com/watch?v=${ID}`,
    `https://www.youtube-nocookie.com/embed/${ID}`,
    `  https://youtu.be/${ID}  `,
  ];
  for (const url of good) assert.equal(extractVideoId(url), ID, url);
});

test('extractVideoId rejects non-YouTube, malformed and spoofed input', () => {
  const bad = [
    '', null, undefined, 42,
    'not a url',
    'https://example.com/watch?v=dQw4w9WgXcQ',
    'https://evil.com/?u=youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ',
    'https://www.youtube.com/watch?v=short',
    'https://www.youtube.com/watch',
    'https://www.youtube.com/playlist?list=PL123',
  ];
  for (const url of bad) assert.equal(extractVideoId(url), null, String(url));
});

function fakeFetch(responses) {
  const urls = [];
  const fn = async (url) => {
    urls.push(String(url));
    const r = responses.shift();
    if (r instanceof Error) throw r;
    return { ok: r.status === undefined || r.status < 400, status: r.status ?? 200, json: async () => r.body };
  };
  return { fn, urls };
}

const item = (n) => ({
  snippet: { topLevelComment: { id: `c${n}`, snippet: { authorDisplayName: `a${n}`, authorProfileImageUrl: 'p', textDisplay: `t${n}`, likeCount: n, publishedAt: '2026-01-01T00:00:00Z' } } },
});
const items = (from, to) => Array.from({ length: to - from }, (_, i) => item(from + i));

test('fetchVideoDetails maps the snippet', async () => {
  const f = fakeFetch([{ body: { items: [{ snippet: { title: 'T', channelTitle: 'C', thumbnails: { high: { url: 'u' } }, publishedAt: 'd' } }] } }]);
  const yt = createYoutubeService({ apiKey: 'K', fetchImpl: f.fn });
  assert.deepEqual(await yt.fetchVideoDetails(ID), { id: ID, title: 'T', channel_title: 'C', thumbnail: 'u', published_at: 'd' });
  assert.match(f.urls[0], /key=K/);
});

test('fetchVideoDetails: empty result is a 404 AppError', async () => {
  const yt = createYoutubeService({ apiKey: 'K', fetchImpl: fakeFetch([{ body: { items: [] } }]).fn });
  await assert.rejects(yt.fetchVideoDetails(ID), (e) => e instanceof AppError && e.status === 404 && e.code === 'VIDEO_NOT_FOUND');
});

test('fetchComments paginates, requests relevance order and honours the cap', async () => {
  const f = fakeFetch([
    { body: { items: items(0, 100), nextPageToken: 'TOK' } },
    { body: { items: items(100, 150) } },
  ]);
  const yt = createYoutubeService({ apiKey: 'K', fetchImpl: f.fn });
  const comments = await yt.fetchComments(ID, 150);
  assert.equal(comments.length, 150);
  assert.equal(comments[0].video_id, ID);
  assert.equal(comments[0].like_count, 0);
  assert.match(f.urls[0], /order=relevance/);
  assert.match(f.urls[0], /maxResults=100/);
  assert.match(f.urls[1], /pageToken=TOK/);
  assert.match(f.urls[1], /maxResults=50/);
});

test('fetchComments: commentsDisabled becomes a friendly 400', async () => {
  const body = { error: { message: 'disabled', errors: [{ reason: 'commentsDisabled' }] } };
  const yt = createYoutubeService({ apiKey: 'K', fetchImpl: fakeFetch([{ status: 403, body }]).fn });
  await assert.rejects(yt.fetchComments(ID, 10), (e) => e.status === 400 && e.code === 'COMMENTS_DISABLED' && /disabled/i.test(e.message));
});

test('network failure becomes a 502 AppError that does not leak the API key', async () => {
  const yt = createYoutubeService({ apiKey: 'SECRETKEY', fetchImpl: fakeFetch([new Error('connect ECONNRESET https://x?key=SECRETKEY')]).fn });
  await assert.rejects(yt.fetchVideoDetails(ID), (e) => e.status === 502 && !e.message.includes('SECRETKEY'));
});

test('quota exhaustion becomes a 503', async () => {
  const body = { error: { errors: [{ reason: 'quotaExceeded' }] } };
  const yt = createYoutubeService({ apiKey: 'K', fetchImpl: fakeFetch([{ status: 403, body }]).fn });
  await assert.rejects(yt.fetchVideoDetails(ID), (e) => e.status === 503);
});
