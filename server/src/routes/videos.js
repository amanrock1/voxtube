const express = require('express');
const { AppError } = require('../utils/errors');

const VIDEO_ID = /^[a-zA-Z0-9_-]{1,200}$/;
const DB_ERROR = 'The database is unavailable right now. Please try again shortly.';

function createVideosRouter({ supabase }) {
  const router = express.Router();

  router.get('/', async (req, res, next) => {
    try {
      const { data, error } = await supabase
        .from('videos')
        .select('id,title,channel_title,thumbnail,published_at,created_at')
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw new AppError(503, DB_ERROR, { cause: new Error(error.message) });
      res.json(data);
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id', async (req, res, next) => {
    try {
      const { id } = req.params;
      if (!VIDEO_ID.test(id)) throw new AppError(400, 'Invalid video ID format');

      const { data: video, error } = await supabase.from('videos').select('*').eq('id', id).maybeSingle();
      if (error) throw new AppError(503, DB_ERROR, { cause: new Error(error.message) });
      if (!video) throw new AppError(404, 'Video analysis record not found');

      const { data: comments, error: cErr } = await supabase.from('comments').select('*').eq('video_id', id);
      if (cErr) throw new AppError(503, DB_ERROR, { cause: new Error(cErr.message) });
      res.json({ video, comments: comments || [] });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = { createVideosRouter };
