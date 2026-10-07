const { AppError } = require('../utils/errors');

const API_BASE = 'https://www.googleapis.com/youtube/v3';
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

/** Extracts an 11-character video id from the common YouTube URL shapes. */
function extractVideoId(input) {
  if (typeof input !== 'string') return null;
  let raw = input.trim();
  if (!raw) return null;
  if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;

  let url;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase().replace(/^(www|m)\./, '');
  let id = null;
  if (host === 'youtu.be') {
    id = url.pathname.slice(1).split('/')[0];
  } else if (host === 'youtube.com' || host === 'music.youtube.com' || host === 'youtube-nocookie.com') {
    if (url.pathname === '/watch') {
      id = url.searchParams.get('v');
    } else {
      const m = url.pathname.match(/^\/(?:embed|shorts|live|v)\/([^/]+)/);
      if (m) id = m[1];
    }
  }
  return id && VIDEO_ID.test(id) ? id : null;
}

function createYoutubeService({ apiKey, fetchImpl = (...args) => globalThis.fetch(...args), timeoutMs = 15000 }) {
  async function call(path, params) {
    const qs = new URLSearchParams({ ...params, key: apiKey });
    let res;
    try {
      res = await fetchImpl(`${API_BASE}/${path}?${qs}`, { signal: AbortSignal.timeout(timeoutMs) });
    } catch {
      // The raw error can contain the request URL (which includes the API key), so it is not kept as `cause`.
      throw new AppError(502, 'Could not reach YouTube. Please try again.');
    }
    if (res.ok) return res.json();

    let body = null;
    try { body = await res.json(); } catch { /* non-JSON error body */ }
    const reason = body?.error?.errors?.[0]?.reason;
    if (reason === 'commentsDisabled') {
      throw new AppError(400, 'Comments are disabled for this YouTube video.', { code: 'COMMENTS_DISABLED' });
    }
    if (reason === 'videoNotFound' || res.status === 404) {
      throw new AppError(404, 'This video is private or does not exist.', { code: 'VIDEO_NOT_FOUND' });
    }
    if (reason === 'quotaExceeded' || reason === 'dailyLimitExceeded') {
      throw new AppError(503, 'The YouTube API quota is used up for today. Please try again later.', { code: 'YOUTUBE_QUOTA' });
    }
    throw new AppError(502, 'YouTube returned an error. Please try again.', {
      cause: new Error(`YouTube HTTP ${res.status}: ${body?.error?.message || 'unknown'}`),
    });
  }

  async function fetchVideoDetails(videoId) {
    const data = await call('videos', { part: 'snippet', id: videoId });
    if (!data.items || data.items.length === 0) {
      throw new AppError(404, 'This video is private or does not exist.', { code: 'VIDEO_NOT_FOUND' });
    }
    const s = data.items[0].snippet;
    return {
      id: videoId,
      title: s.title,
      channel_title: s.channelTitle,
      thumbnail: s.thumbnails?.high?.url || s.thumbnails?.default?.url || null,
      published_at: s.publishedAt,
    };
  }

  async function fetchComments(videoId, maxComments = 300) {
    const comments = [];
    let pageToken;
    while (comments.length < maxComments) {
      const params = {
        part: 'snippet',
        videoId,
        maxResults: String(Math.min(100, maxComments - comments.length)),
        order: 'relevance',
        textFormat: 'plainText',
      };
      if (pageToken) params.pageToken = pageToken;

      const data = await call('commentThreads', params);
      if (!data.items || data.items.length === 0) break;

      for (const item of data.items) {
        const s = item.snippet.topLevelComment.snippet;
        comments.push({
          id: item.snippet.topLevelComment.id,
          video_id: videoId,
          author_name: s.authorDisplayName,
          author_profile_image: s.authorProfileImageUrl || null,
          text: s.textDisplay,
          like_count: s.likeCount || 0,
          published_at: s.publishedAt,
        });
      }
      pageToken = data.nextPageToken;
      if (!pageToken) break;
    }
    return comments;
  }

  return { fetchVideoDetails, fetchComments };
}

module.exports = { extractVideoId, createYoutubeService };
