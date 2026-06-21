const dotenv = require('dotenv');
const cheerio = require('cheerio');
dotenv.config();

/**
 * Helper to extract Reddit Post ID and Subreddit from various URL formats
 * @param {string} url - Reddit URL
 * @returns {object|null} - { id, subreddit } or null
 */
function extractRedditInfo(url) {
  if (!url) return null;
  const regExp = /reddit\.com\/r\/([^/]+)\/comments\/([^/]+)/i;
  const match = url.match(regExp);
  if (match) {
    return {
      subreddit: match[1],
      id: match[2]
    };
  }
  return null;
}

/**
 * Clean up HTML entities in extracted text strings
 * @param {string} str - Raw string with HTML entities
 * @returns {string} - Cleaned string
 */
function decodeHtmlEntities(str) {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&nbsp;/g, ' ');
}

/**
 * Fetch post details and comments from a Reddit thread via old.reddit.com scraper
 * Bypasses API key requirements and Varnish blocks.
 * @param {string} rawUrl 
 * @returns {Promise<object>} - { postDetails, comments }
 */
async function fetchRedditThread(rawUrl, _redirectDepth = 0) {
  const info = extractRedditInfo(rawUrl);
  if (!info) {
    throw new Error('Invalid Reddit Post URL format');
  }

  // Fetch using the short url path on old.reddit.com to prevent 404s
  const oldRedditUrl = `https://old.reddit.com/comments/${info.id}`;
  console.log(`Scraping Reddit page: ${oldRedditUrl}`);

  // \u2500\u2500\u2500 SECURITY: 3-minute timeout \u2014 prevents server hanging forever if Reddit is slow/down
  const controller = new AbortController();
  const fetchTimeout = setTimeout(() => controller.abort(), 3 * 60 * 1000); // 3 minutes

  let response;
  try {
    response = await fetch(oldRedditUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });
  } catch (err) {
    clearTimeout(fetchTimeout);
    if (err.name === 'AbortError') {
      throw new Error('Reddit fetch timed out after 3 minutes. The thread may be too large or Reddit is slow.');
    }
    throw err;
  }
  clearTimeout(fetchTimeout);

  if (!response.ok) {
    throw new Error(`Failed to scrape Reddit thread (HTTP ${response.status})`);
  }

  const html = await response.text();
  if (html.includes('301 Moved Permanently')) {
    // \u2500\u2500\u2500 SECURITY: Limit redirect hops to prevent infinite recursion / stack overflow \u2500
    if (_redirectDepth >= 3) {
      throw new Error('Too many redirects while fetching Reddit thread.');
    }
    const redirectMatch = html.match(/href="([^"]+)"/);
    if (redirectMatch) {
      return fetchRedditThread(redirectMatch[1], _redirectDepth + 1);
    }
  }

  const $ = cheerio.load(html);

  // 1. Extract Post Title
  const titleText = $('a.title').first().text().trim();
  const title = titleText ? decodeHtmlEntities(titleText) : 'Unknown Reddit Post';

  const postDetails = {
    id: info.id,
    title,
    channel_title: `r/${info.subreddit}`,
    thumbnail: 'https://www.redditstatic.com/icon.png',
    published_at: new Date().toISOString()
  };

  // 2. Parse Comments using structured hierarchy
  const commentsList = [];
  const MAX_REPLIES_PER_SOLUTION = 5; // Capping replies per solution to preserve budget (Option A)
  const MAX_TOTAL_COMMENTS = 150;

  // Find all top-level comments (proposed solutions)
  const rootComments = $('.sitetable.nestedlisting > .comment');
  console.log(`Found ${rootComments.length} root comments in thread.`);

  rootComments.each((index, rootEl) => {
    if (commentsList.length >= MAX_TOTAL_COMMENTS) return false;

    const rootId = $(rootEl).attr('data-fullname')?.replace('t1_', '') || $(rootEl).attr('id')?.replace('thing_t1_', '');
    const rootAuthor = $(rootEl).attr('data-author') || '[deleted]';
    
    // Extract text
    const rootText = decodeHtmlEntities($(rootEl).find('> .entry > .usertext > .usertext-body > .md').first().text().trim());
    
    // Extract score
    const scoreText = $(rootEl).find('> .entry > .tagline > .score.unvoted').first().attr('title') || '0';
    const rootLikes = parseInt(scoreText) || 0;
    
    // Extract time
    const rootTime = $(rootEl).find('> .entry > .tagline > time').first().attr('datetime') || new Date().toISOString();

    if (rootAuthor !== '[deleted]' && rootText.length > 0 && rootId) {
      commentsList.push({
        id: rootId,
        video_id: info.id,
        author_name: rootAuthor,
        author_profile_image: `https://www.redditstatic.com/avatars/defaults/v2/avatar_default_${Math.abs(rootAuthor.charCodeAt(0) || 0) % 5}.png`,
        text: rootText,
        like_count: rootLikes,
        published_at: rootTime,
        parent_id: null // Top-level comment
      });

      // Find child comments (direct replies to this solution - Option C)
      const childComments = $(rootEl).find('> .child > .sitetable > .comment');
      let replyCount = 0;

      childComments.each((cIndex, childEl) => {
        if (replyCount >= MAX_REPLIES_PER_SOLUTION || commentsList.length >= MAX_TOTAL_COMMENTS) return false;

        const childId = $(childEl).attr('data-fullname')?.replace('t1_', '') || $(childEl).attr('id')?.replace('thing_t1_', '');
        const childAuthor = $(childEl).attr('data-author') || '[deleted]';
        const childText = decodeHtmlEntities($(childEl).find('> .entry > .usertext > .usertext-body > .md').first().text().trim());
        const childScoreText = $(childEl).find('> .entry > .tagline > .score.unvoted').first().attr('title') || '0';
        const childLikes = parseInt(childScoreText) || 0;
        const childTime = $(childEl).find('> .entry > .tagline > time').first().attr('datetime') || new Date().toISOString();

        if (childAuthor !== '[deleted]' && childText.length > 0 && childId) {
          commentsList.push({
            id: childId,
            video_id: info.id,
            author_name: childAuthor,
            author_profile_image: `https://www.redditstatic.com/avatars/defaults/v2/avatar_default_${Math.abs(childAuthor.charCodeAt(0) || 0) % 5}.png`,
            text: childText,
            like_count: childLikes,
            published_at: childTime,
            parent_id: rootId // References the solution
          });
          replyCount++;
        }
      });
    }
  });

  console.log(`Successfully scraped and parsed ${commentsList.length} comments using Cheerio hierarchy.`);

  return {
    postDetails,
    comments: commentsList
  };
}

module.exports = {
  extractRedditInfo,
  fetchRedditThread
};
