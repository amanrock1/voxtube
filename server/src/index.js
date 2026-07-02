const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const supabase = require('./utils/supabase');
const { extractVideoId, fetchVideoDetails, fetchComments } = require('./services/youtubeService');
const { extractRedditInfo, fetchRedditThread } = require('./services/redditService');
const { classifyCommentsBatch, generateVideoSummary, generateRedditSummary } = require('./services/aiService');

dotenv.config();

// ─── SECURITY: Startup environment variable check ────────────────────────────
const REQUIRED_ENV_VARS = ['SUPABASE_URL', 'SUPABASE_KEY', 'GEMINI_API_KEY', 'YOUTUBE_API_KEY', 'TURNSTILE_SECRET_KEY'];
const missingVars = REQUIRED_ENV_VARS.filter(v => !process.env[v]);
if (missingVars.length > 0) {
  console.error(`[STARTUP ERROR] Missing required environment variables: ${missingVars.join(', ')}`);
  console.error('Please check your .env file. Server will continue but some features will fail.');
}

// ─── SECURITY: Cloudflare Turnstile CAPTCHA middleware ────────────────────────
const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY;
async function requireTurnstile(req, res, next) {
  // Allow bypassing in development if key is not set
  if (!TURNSTILE_SECRET_KEY) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[WARN] TURNSTILE_SECRET_KEY is not set — CAPTCHA verification skipped.');
      return next();
    }
    return res.status(500).json({ error: 'Server misconfiguration: CAPTCHA key is missing.' });
  }

  const { turnstileToken } = req.body;
  if (!turnstileToken) {
    return res.status(400).json({ error: 'Security check (CAPTCHA) token is required.' });
  }

  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${encodeURIComponent(TURNSTILE_SECRET_KEY)}&response=${encodeURIComponent(turnstileToken)}`
    });

    const data = await response.json();
    if (!data.success) {
      return res.status(403).json({ error: 'Security check (CAPTCHA) failed. Please try again.' });
    }

    next();
  } catch (error) {
    console.error('[ERROR] Turnstile validation failed:', error.message);
    return res.status(500).json({ error: 'Failed to verify security check. Please try again later.' });
  }
}

const app = express();
const PORT = process.env.PORT || 5000;

// ─── SECURITY: Trust proxy — allows rate limiter to see real IPs behind Vercel/Render 
app.set('trust proxy', 1);

// ─── SECURITY: Helmet — sets 11 secure HTTP headers automatically ─────────────
app.use(helmet());

// ─── SECURITY: CORS — restrict to known frontend origins only ─────────────────
const allowedOrigins = [
  'http://localhost:5173',   // Vite dev server
  'http://localhost:3000',   // Alternative dev port
  'https://voxtube-aman.vercel.app', // Production frontend
  process.env.FRONTEND_URL  // Production URL (set in .env when deployed)
].filter(Boolean); // Remove undefined entries

app.use(cors({
  origin: function (origin, callback) {
    // ─── SECURITY: Reject requests with no origin in production to prevent script/Postman abuse
    if (!origin) {
      if (process.env.NODE_ENV === 'development') return callback(null, true);
      return callback(new Error('CORS: Origin not allowed (Missing Origin Header)'), false);
    }
    if (origin.startsWith('http://localhost:') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('CORS: Origin not allowed'), false);
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'x-api-key']
}));

// ─── SECURITY: Body size limit — prevent body-stuffing / memory exhaustion ────
app.use(express.json({ limit: '10kb' }));

// ─── SECURITY: Rate limiting — protect /api/analyze from quota abuse ──────────
const analyzeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,                   // Max 30 requests per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please wait a few minutes before trying again.' }
});

// Health check endpoint (no rate limit needed)
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date() });
});

/**
 * POST /api/analyze
 * Body: { url }
 * Analyze comments for a public YouTube video or Reddit post
 */
app.post('/api/analyze', requireTurnstile, analyzeLimiter, async (req, res) => {
  const { url } = req.body;

  // ─── SECURITY: Input validation ──────────────────────────────────────────────
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }
  if (typeof url !== 'string') {
    return res.status(400).json({ error: 'URL must be a string' });
  }
  if (url.length > 500) {
    return res.status(400).json({ error: 'URL is too long (maximum 500 characters)' });
  }

  const redditInfo = extractRedditInfo(url);
  const isReddit = !!redditInfo;
  const videoId = isReddit ? `reddit_${redditInfo.id}` : extractVideoId(url);

  if (!videoId) {
    return res.status(400).json({ error: 'Invalid YouTube or Reddit URL format' });
  }

  try {
    // 1. Check if record already exists in the database
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

      // Check if this record has a failed/fallback summary from a previous run
      const isFailedSummary = !existingVideo.summary || 
        existingVideo.summary.includes('Error generating') || 
        existingVideo.summary.includes('Failed to generate');

      // Check if the record has a summary indicating there should be comments, but no comments are stored in the database
      const isMissingComments = (!existingComments || existingComments.length === 0) &&
        existingVideo.summary !== 'This thread has no comments to analyze.' &&
        existingVideo.summary !== 'This video has no comments to analyze.';

      if (isFailedSummary || isMissingComments) {
        console.log(`Corrupted cache detected for ${videoId} (isFailedSummary: ${isFailedSummary}, isMissingComments: ${isMissingComments}). Auto-healing cache...`);
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

    let videoDetails;
    let uniqueCommentsList = [];

    if (isReddit) {
      // Fetch details and comments from Reddit
      console.log(`Fetching Reddit post details & comments for ${videoId}...`);
      const redditData = await fetchRedditThread(url);
      
      videoDetails = {
        ...redditData.postDetails,
        id: videoId // Use prefixed id (reddit_...)
      };

      // Format comment IDs and video_ids to prevent conflicts
      uniqueCommentsList = redditData.comments.map(comment => ({
        ...comment,
        id: `reddit_c_${comment.id}`,
        video_id: videoId
      }));

    } else {
      // Fetch video details from YouTube API
      console.log(`Fetching details for video ${videoId}...`);
      videoDetails = await fetchVideoDetails(videoId);

      // Fetch comment threads from YouTube API
      console.log(`Fetching comments for video ${videoId}...`);
      const commentsList = await fetchComments(videoId, 300); // fetch up to 300 comments

      // Deduplicate comments by ID to prevent unique constraint violations
      const uniqueCommentsMap = new Map();
      commentsList.forEach(comment => {
        if (comment.id) {
          uniqueCommentsMap.set(comment.id, comment);
        }
      });
      uniqueCommentsList = Array.from(uniqueCommentsMap.values());
    }

    if (uniqueCommentsList.length === 0) {
      const fallbackSummary = isReddit ? 'This thread has no comments to analyze.' : 'This video has no comments to analyze.';
      // Create empty record for items with no comments
      const { error: insErr } = await supabase
        .from('videos')
        .upsert([{ ...videoDetails, summary: fallbackSummary }]);
        
      if (insErr) throw insErr;
      
      return res.json({
        cached: false,
        video: { ...videoDetails, summary: fallbackSummary },
        comments: []
      });
    }

    // 4. Batch classify comments sequentially with Gemini (rate limit optimization)
    console.log(`Classifying ${uniqueCommentsList.length} comments sequentially...`);
    const batchSize = 300;
    const batches = [];

    for (let i = 0; i < uniqueCommentsList.length; i += batchSize) {
      batches.push(uniqueCommentsList.slice(i, i + batchSize));
    }

    const classifiedResults = [];
    for (const batch of batches) {
      const results = await classifyCommentsBatch(batch);
      classifiedResults.push(...results);
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

    // 5. Generate high-level summary with Gemini
    console.log('Generating AI summary...');
    let videoSummary;
    if (isReddit) {
      videoSummary = await generateRedditSummary(videoDetails.title, analyzedComments);
    } else {
      videoSummary = await generateVideoSummary(analyzedComments);
    }
    videoDetails.summary = videoSummary;

    // 6. Save results to database (Supabase)
    console.log('Writing records to Supabase...');
    const { error: videoInsErr } = await supabase
      .from('videos')
      .upsert([videoDetails]);

    if (videoInsErr) throw videoInsErr;

    // Strip temporary non-column properties like parent_id if Postgres doesn't have it
    const dbComments = analyzedComments.map(({ parent_id, ...comment }) => comment);

    const { error: commentsInsErr } = await supabase
      .from('comments')
      .upsert(dbComments);

    if (commentsInsErr) throw commentsInsErr;

    res.json({
      cached: false,
      video: videoDetails,
      comments: analyzedComments
    });

  } catch (error) {
    // ─── SECURITY: Never leak internal error details to the client ────────────
    console.error('[ERROR] Analysis pipeline failed:', error.message, error.stack || '');
    
    const msg = error.message || '';
    if (msg.includes('disabled comments') || msg.includes('comments disabled')) {
      return res.status(400).json({ error: 'Comments are disabled for this YouTube video.' });
    }
    if (msg.includes('private') || msg.includes('not found')) {
      return res.status(400).json({ error: 'This video is private or does not exist.' });
    }
    
    res.status(500).json({ error: 'An error occurred during comment analysis. Please try again.' });
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
    console.error('[ERROR] GET /api/videos failed:', error.message);
    res.status(500).json({ error: 'Failed to fetch recent videos.' });
  }
});

/**
 * GET /api/videos/:id
 * Fetch details and comments for a specific analyzed video
 */
app.get('/api/videos/:id', async (req, res) => {
  const { id } = req.params;

  // ─── SECURITY: Validate :id path parameter ───────────────────────────────────
  if (!id || typeof id !== 'string' || id.length > 200) {
    return res.status(400).json({ error: 'Invalid video ID' });
  }
  // Only allow alphanumeric chars, underscores, and hyphens (prevents injection)
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    return res.status(400).json({ error: 'Invalid video ID format' });
  }

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
    console.error('[ERROR] GET /api/videos/:id failed:', error.message);
    res.status(500).json({ error: 'Failed to fetch video record.' });
  }
});

// Start API Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
