const dotenv = require('dotenv');
dotenv.config();

const API_KEY = process.env.YOUTUBE_API_KEY;

/**
 * Helper to extract YouTube Video ID from various URL formats
 * @param {string} url - YouTube URL
 * @returns {string|null} - Video ID or null
 */
function extractVideoId(url) {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

/**
 * Fetch video details (Title, Channel Name, Thumbnail, Published Date)
 * @param {string} videoId 
 * @returns {Promise<object>}
 */
async function fetchVideoDetails(videoId) {
  if (!API_KEY) {
    throw new Error('YOUTUBE_API_KEY is not defined in environment variables.');
  }

  const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${API_KEY}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Failed to fetch video details');
  }

  const data = await response.json();
  if (!data.items || data.items.length === 0) {
    throw new Error('Video not found or is private');
  }

  const snippet = data.items[0].snippet;
  return {
    id: videoId,
    title: snippet.title,
    channel_title: snippet.channelTitle,
    thumbnail: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url,
    published_at: snippet.publishedAt
  };
}

/**
 * Fetch comment threads for a video
 * @param {string} videoId 
 * @param {number} maxComments - Maximum comments to fetch (to protect quotas)
 * @returns {Promise<Array>} - List of comments
 */
async function fetchComments(videoId, maxComments = 200) {
  if (!API_KEY) {
    throw new Error('YOUTUBE_API_KEY is not defined in environment variables.');
  }

  let comments = [];
  let nextPageToken = '';
  let fetchedCount = 0;

  // Loop to handle pagination until we reach maxComments or run out of comments
  while (fetchedCount < maxComments) {
    const limit = Math.min(100, maxComments - fetchedCount);
    let url = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=${limit}&textFormat=plainText&key=${API_KEY}`;
    
    if (nextPageToken) {
      url += `&pageToken=${nextPageToken}`;
    }

    const response = await fetch(url);
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'Failed to fetch comments');
    }

    const data = await response.json();
    if (!data.items || data.items.length === 0) break;

    const parsedComments = data.items.map(item => {
      const snippet = item.snippet.topLevelComment.snippet;
      return {
        id: item.snippet.topLevelComment.id,
        video_id: videoId,
        author_name: snippet.authorDisplayName,
        author_profile_image: snippet.authorProfileImageUrl,
        text: snippet.textDisplay,
        like_count: snippet.likeCount || 0,
        published_at: snippet.publishedAt
      };
    });

    comments = comments.concat(parsedComments);
    fetchedCount += parsedComments.length;
    
    nextPageToken = data.nextPageToken;
    if (!nextPageToken) break; // No more comments
  }

  return comments;
}

module.exports = {
  extractVideoId,
  fetchVideoDetails,
  fetchComments
};
