const EMPTY_SUMMARIES = new Set(['This thread has no comments to analyze.', 'This video has no comments to analyze.']);
const LEGACY_FAILURE_MARKERS = ['Error generating', 'Failed to generate'];
const MIN_COMMENTS_FOR_UNCLASSIFIED_CHECK = 10;

/** Returns why a cached record must be discarded and re-analysed, or null when it is usable. */
function getCacheProblem({ video, comments, now = Date.now(), ttlMs }) {
  const summary = video.summary;
  if (!summary || !String(summary).trim()) return 'missing-summary';
  if (LEGACY_FAILURE_MARKERS.some((m) => summary.includes(m))) return 'failed-summary';

  if (video.created_at) {
    const age = now - Date.parse(video.created_at);
    if (Number.isFinite(age) && age > ttlMs) return 'stale';
  }

  if (comments.length === 0 && !EMPTY_SUMMARIES.has(summary)) return 'missing-comments';

  // Older versions saved Neutral/Noise for every comment when Gemini failed.
  if (comments.length >= MIN_COMMENTS_FOR_UNCLASSIFIED_CHECK
    && comments.every((c) => c.sentiment === 'Neutral' && c.category === 'Noise')) {
    return 'unclassified';
  }
  return null;
}

module.exports = { getCacheProblem };
