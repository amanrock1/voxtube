const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const supabase = require('./utils/supabase');
const { extractVideoId, fetchVideoDetails, fetchComments } = require('./services/youtubeService');
const { classifyCommentsBatch, generateVideoSummary } = require('./services/aiService');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date() });
});

/**
 * POST /api/analyze
 * Body: { url }
 * Analyze comments for a public YouTube video
 */
app.post('/api/analyze', async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'YouTube URL is required' });
  }

  const videoId = extractVideoId(url);
  if (!videoId) {
    return res.status(400).json({ error: 'Invalid YouTube Video URL format' });
  }

  try {
    // 1. Check if video already exists in the database
    const { data: existingVideo, error: selectErr } = await supabase
      .from('videos')
      .select('*')
      .eq('id', videoId)
      .single();

    if (existingVideo) {
      // Fetch associated comments to verify cache integrity
      const { data: existingComments } = await supabase
        .from('comments')
        .select('*')
        .eq('video_id', videoId);

      // Check if this video has a failed/fallback summary from a previous run
      const isFailedSummary = !existingVideo.summary || 
        existingVideo.summary.includes('Error generating') || 
        existingVideo.summary.includes('Failed to generate summary');

      // Check if the video has a summary indicating there should be comments, but no comments are stored in the database
      const isMissingComments = (!existingComments || existingComments.length === 0) &&
        existingVideo.summary !== 'This video has no comments to analyze.';

      if (isFailedSummary || isMissingComments) {
        console.log(`Corrupted cache detected for video ${videoId} (isFailedSummary: ${isFailedSummary}, isMissingComments: ${isMissingComments}). Auto-healing cache...`);
        // Delete stale records to allow a fresh analysis
        await supabase.from('comments').delete().eq('video_id', videoId);
        await supabase.from('videos').delete().eq('id', videoId);
      } else {
        return res.json({
          cached: true,
          video: existingVideo,
          comments: existingComments || []
        });
      }
    }

    // 2. Fetch video details from YouTube API
    console.log(`Fetching details for video ${videoId}...`);
    const videoDetails = await fetchVideoDetails(videoId);

    // 3. Fetch comment threads from YouTube API
    console.log(`Fetching comments for video ${videoId}...`);
    const commentsList = await fetchComments(videoId, 300); // fetch up to 300 comments (matches AI batch size)

    // Deduplicate comments by ID to prevent unique constraint violations
    const uniqueCommentsMap = new Map();
    commentsList.forEach(comment => {
      if (comment.id) {
        uniqueCommentsMap.set(comment.id, comment);
      }
    });
    const uniqueCommentsList = Array.from(uniqueCommentsMap.values());

    if (uniqueCommentsList.length === 0) {
      // Create empty record for videos with no comments
      const { error: insErr } = await supabase
        .from('videos')
        .upsert([{ ...videoDetails, summary: 'This video has no comments to analyze.' }]);
        
      if (insErr) throw insErr;
      
      return res.json({
        cached: false,
        video: { ...videoDetails, summary: 'This video has no comments to analyze.' },
        comments: []
      });
    }

    // 4. Batch classify comments sequentially with Gemini (rate limit optimization)
    console.log(`Classifying ${uniqueCommentsList.length} comments sequentially...`);
    const batchSize = 300; // Increased to 300 to process everything in a single API call (prevents 429 Too Many Requests)
    const batches = [];

    for (let i = 0; i < uniqueCommentsList.length; i += batchSize) {
      batches.push(uniqueCommentsList.slice(i, i + batchSize));
    }

    // Process sequentially to avoid 429 Too Many Requests on free tier
    const classifiedResults = [];
    for (const batch of batches) {
      const results = await classifyCommentsBatch(batch);
      classifiedResults.push(...results);
      // Small delay between batches to respect free tier RPM
      if (batches.length > 1) {
          await new Promise(r => setTimeout(r, 2000));
      }
    }

    // Map AI results back to comments
    const analyzedComments = uniqueCommentsList.map(comment => {
      const classification = classifiedResults.find(r => r.id === comment.id);
      return {
        ...comment,
        sentiment: classification?.sentiment || 'Neutral',
        category: classification?.category || 'Noise'
      };
    });

    // 5. Generate high-level video summary with Gemini
    console.log('Generating AI summary of comments...');
    const videoSummary = await generateVideoSummary(analyzedComments);
    videoDetails.summary = videoSummary;

    // 6. Save results to database (Supabase) using upsert to avoid duplicate key issues
    console.log('Writing records to Supabase...');
    const { error: videoInsErr } = await supabase
      .from('videos')
      .upsert([videoDetails]);

    if (videoInsErr) throw videoInsErr;

    const { error: commentsInsErr } = await supabase
      .from('comments')
      .upsert(analyzedComments);

    if (commentsInsErr) throw commentsInsErr;

    res.json({
      cached: false,
      video: videoDetails,
      comments: analyzedComments
    });

  } catch (error) {
    console.error('Error during analysis pipeline:', error.message);
    res.status(500).json({ error: error.message || 'An error occurred during comment analysis' });
  }
});

/**
 * GET /api/videos
 * Fetch recently analyzed videos
 */
app.get('/api/videos', async (req, res) => {
  try {
    const { data: videos, error } = await supabase
      .from('videos')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;
    res.json(videos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/videos/:id
 * Fetch details and comments for a specific analyzed video
 */
app.get('/api/videos/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const { data: video, error: videoErr } = await supabase
      .from('videos')
      .select('*')
      .eq('id', id)
      .single();

    if (videoErr || !video) {
      return res.status(404).json({ error: 'Video analysis record not found' });
    }

    const { data: comments, error: commentsErr } = await supabase
      .from('comments')
      .select('*')
      .eq('video_id', id);

    if (commentsErr) throw commentsErr;

    res.json({
      video,
      comments: comments || []
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start API Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
// Trigger nodemon restart on freed port
