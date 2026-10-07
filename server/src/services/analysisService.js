const { AppError } = require('../utils/errors');
const { extractVideoId } = require('./youtubeService');
const { extractRedditInfo } = require('./redditService');
const { getCacheProblem } = require('../utils/cachePolicy');

const COMMENT_UPSERT_BATCH = 500;
const EMPTY_SUMMARY = {
  reddit: 'This thread has no comments to analyze.',
  youtube: 'This video has no comments to analyze.',
};
const DB_READ_ERROR = 'The database is unavailable right now. Please try again shortly.';
const DB_WRITE_ERROR = 'Could not save the analysis. Please try again shortly.';

const dedupeById = (rows) => [...new Map(rows.filter((r) => r.id).map((r) => [r.id, r])).values()];
const stripParent = ({ parent_id, ...rest }) => rest;

function createAnalysisService({ supabase, youtube, reddit, ai, ttlMs, now = () => Date.now(), maxYoutubeComments = 300 }) {
  const inflight = new Map();

  async function check(query, message) {
    const { data, error } = await query;
    if (error) throw new AppError(503, message, { cause: new Error(error.message) });
    return data;
  }

  function resolveTarget(url) {
    const r = extractRedditInfo(url);
    if (r) return { source: 'reddit', id: `reddit_${r.id}` };
    const y = extractVideoId(url);
    if (y) return { source: 'youtube', id: y };
    throw new AppError(400, 'Invalid YouTube or Reddit URL format');
  }

  async function deleteRecord(id) {
    await check(supabase.from('comments').delete().eq('video_id', id), DB_WRITE_ERROR);
    await check(supabase.from('videos').delete().eq('id', id), DB_WRITE_ERROR);
  }

  async function readCache(id) {
    const video = await check(supabase.from('videos').select('*').eq('id', id).maybeSingle(), DB_READ_ERROR);
    if (!video) return null;
    const comments = (await check(supabase.from('comments').select('*').eq('video_id', id), DB_READ_ERROR)) || [];
    const problem = getCacheProblem({ video, comments, now: now(), ttlMs });
    if (problem === 'stale') {
      // Valid but old: keep it until a fresh analysis has been saved, so an AI/API outage cannot destroy it.
      console.log(`[cache] ${id} is stale; re-analysing (old record kept until replaced)`);
      return null;
    }
    if (problem) {
      console.log(`[cache] discarding ${id}: ${problem}`);
      await deleteRecord(id);
      return null;
    }
    return { cached: true, video, comments };
  }

  async function fetchSource(target, url) {
    if (target.source === 'reddit') {
      const thread = await reddit.fetchRedditThread(url);
      // One prefixed id space for both id and parent_id keeps reply threading intact.
      const comments = thread.comments.map((c) => ({
        ...c,
        id: `reddit_c_${c.id}`,
        parent_id: c.parent_id ? `reddit_c_${c.parent_id}` : null,
        video_id: target.id,
      }));
      return { video: { ...thread.postDetails, id: target.id }, comments: dedupeById(comments) };
    }
    const video = await youtube.fetchVideoDetails(target.id);
    const comments = await youtube.fetchComments(target.id, maxYoutubeComments);
    return { video, comments: dedupeById(comments) };
  }

  async function save(video, comments) {
    // A re-analysis replaces the old comments; ids can differ between runs, so clear them first.
    await check(supabase.from('comments').delete().eq('video_id', video.id), DB_WRITE_ERROR);
    await check(supabase.from('videos').upsert([video]), DB_WRITE_ERROR);
    try {
      const rows = comments.map(stripParent);
      for (let i = 0; i < rows.length; i += COMMENT_UPSERT_BATCH) {
        await check(supabase.from('comments').upsert(rows.slice(i, i + COMMENT_UPSERT_BATCH)), DB_WRITE_ERROR);
      }
    } catch (err) {
      // Never leave a half-saved analysis: the next request would wrongly treat it as cached.
      // Comments are deleted explicitly so this does not depend on ON DELETE CASCADE existing in the live database.
      for (const query of [supabase.from('comments').delete().eq('video_id', video.id), supabase.from('videos').delete().eq('id', video.id)]) {
        try {
          const { error } = await query;
          if (error) console.error('[ERROR] rollback failed:', error.message);
        } catch (rollbackErr) {
          console.error('[ERROR] rollback failed:', rollbackErr.message);
        }
      }
      throw err;
    }
  }

  async function run(target, url) {
    const cached = await readCache(target.id);
    if (cached) return cached;

    const { video, comments } = await fetchSource(target, url);

    if (comments.length === 0) {
      const empty = { ...video, summary: EMPTY_SUMMARY[target.source] };
      await save(empty, []);
      return { cached: false, video: empty, comments: [] };
    }

    const labels = await ai.classifyComments(comments);
    const analyzed = comments.map((c, i) => ({ ...c, sentiment: labels[i].sentiment, category: labels[i].category }));
    const summary = target.source === 'reddit'
      ? await ai.generateRedditSummary(video.title, analyzed)
      : await ai.generateVideoSummary(analyzed);

    const fullVideo = { ...video, summary };
    await save(fullVideo, analyzed);
    return { cached: false, video: fullVideo, comments: analyzed.map(stripParent) };
  }

  /** Identical concurrent requests share one job, so a double-click never costs two analyses. */
  async function analyze(url) {
    const target = resolveTarget(url);
    let job = inflight.get(target.id);
    if (!job) {
      job = run(target, url).finally(() => inflight.delete(target.id));
      inflight.set(target.id, job);
    }
    return job;
  }

  return { analyze };
}

module.exports = { createAnalysisService };
