const express = require('express');
const helmet = require('helmet');
const { createOriginPolicy } = require('./middleware/originPolicy');
const { createTurnstile } = require('./middleware/turnstile');
const { createAnalyzeLimiter, createReadLimiter } = require('./middleware/limits');
const { notFound, errorHandler } = require('./middleware/errors');
const { createAnalyzeHandler } = require('./routes/analyze');
const { createVideosRouter } = require('./routes/videos');

function createApp({ config, supabase, analysis, fetchImpl, limiterOptions = {} }) {
  const app = express();
  app.set('trust proxy', 1); // real client IPs behind Render/Vercel for the rate limiter
  app.use(helmet());

  const { corsMiddleware, originGuard } = createOriginPolicy(config);
  app.use(corsMiddleware);
  app.use(originGuard);
  app.use(express.json({ limit: '10kb' }));

  app.get('/api/health', (req, res) => res.json({ status: 'healthy', timestamp: new Date() }));

  const turnstile = createTurnstile({ secret: config.turnstileSecret, isDev: config.isDev, fetchImpl });
  // Limiter first: attempts that fail the CAPTCHA must still count against the limit.
  app.post('/api/analyze', createAnalyzeLimiter(limiterOptions.analyze), turnstile, createAnalyzeHandler({ analysis }));
  app.use('/api/videos', createReadLimiter(limiterOptions.read), createVideosRouter({ supabase }));

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
