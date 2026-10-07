const cheerio = require('cheerio');
const { AppError } = require('../utils/errors');

const MAX_REPLIES_PER_SOLUTION = 5;
const MAX_TOTAL_COMMENTS = 150;
const REDDIT_URL = /^(?:https?:\/\/)?(?:[a-z0-9-]+\.)?reddit\.com\/r\/([^/?#]+)\/comments\/([a-z0-9]+)/i;

const REQUEST_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml',
  'Accept-Language': 'en-US,en;q=0.9',
};

function extractRedditInfo(url) {
  if (typeof url !== 'string') return null;
  const m = url.trim().match(REDDIT_URL);
  return m ? { subreddit: m[1], id: m[2] } : null;
}

function readComment($, el, parentId) {
  const $el = $(el);
  const id = $el.attr('data-fullname')?.replace('t1_', '') || $el.attr('id')?.replace('thing_t1_', '');
  const author = $el.attr('data-author') || '[deleted]';
  const text = $el.find('> .entry > .usertext > .usertext-body > .md').first().text().trim();
  if (!id || author === '[deleted]' || !text) return null;

  const likes = parseInt($el.find('> .entry > .tagline > .score.unvoted').first().attr('title'), 10);
  return {
    id,
    author_name: author,
    author_profile_image: null,
    text,
    like_count: Number.isFinite(likes) ? likes : 0,
    published_at: $el.find('> .entry > .tagline > time').first().attr('datetime') || null,
    parent_id: parentId,
  };
}

/** Pure HTML -> data. Comment ids and parent ids are raw Reddit ids. */
function parseThread(html, info) {
  const $ = cheerio.load(html);
  if ($('.nestedlisting').length === 0 && $('a.title').length === 0) {
    throw new AppError(502, 'Could not read this Reddit page. Reddit may have blocked the request.', { code: 'REDDIT_UNREADABLE' });
  }

  const postDetails = {
    id: info.id,
    title: $('a.title').first().text().trim() || 'Unknown Reddit Post',
    channel_title: `r/${info.subreddit}`,
    thumbnail: 'https://www.redditstatic.com/icon.png',
    published_at: $('#siteTable .tagline time').first().attr('datetime') || null,
  };

  const comments = [];
  $('.sitetable.nestedlisting > .comment').each((_, rootEl) => {
    if (comments.length >= MAX_TOTAL_COMMENTS) return false;
    const root = readComment($, rootEl, null);
    if (!root) return;
    comments.push(root);

    let replies = 0;
    $(rootEl).find('> .child > .sitetable > .comment').each((__, childEl) => {
      if (replies >= MAX_REPLIES_PER_SOLUTION || comments.length >= MAX_TOTAL_COMMENTS) return false;
      const child = readComment($, childEl, root.id);
      if (!child) return;
      comments.push(child);
      replies++;
    });
  });

  return { postDetails, comments };
}

function createRedditService({ fetchImpl = (...args) => globalThis.fetch(...args), timeoutMs = 20000 } = {}) {
  async function fetchRedditThread(url) {
    const info = extractRedditInfo(url);
    if (!info) throw new AppError(400, 'Invalid Reddit post URL.');

    let res;
    try {
      res = await fetchImpl(`https://old.reddit.com/comments/${info.id}`, {
        headers: REQUEST_HEADERS,
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (err) {
      if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
        throw new AppError(504, 'Reddit took too long to respond. Please try again.', { cause: err });
      }
      throw new AppError(502, 'Could not reach Reddit. Please try again.', { cause: err });
    }

    if (res.status === 403 || res.status === 429) {
      throw new AppError(502, 'Reddit blocked the request from this server. Try again later, or analyze a YouTube link.', { code: 'REDDIT_BLOCKED' });
    }
    if (res.status === 404) throw new AppError(404, 'This Reddit thread was not found.');
    if (!res.ok) throw new AppError(502, `Reddit returned an error (HTTP ${res.status}). Please try again.`);

    return parseThread(await res.text(), info);
  }

  return { fetchRedditThread };
}

module.exports = { extractRedditInfo, parseThread, createRedditService };
