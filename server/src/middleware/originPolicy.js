const cors = require('cors');
const { AppError } = require('../utils/errors');

const LOCAL_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

function createOriginPolicy(config) {
  const isAllowed = (origin) =>
    config.allowedOrigins.includes(origin) || (config.isDev && LOCAL_ORIGIN.test(origin));

  const corsMiddleware = cors({
    origin: (origin, cb) => cb(null, Boolean(origin) && isAllowed(origin)),
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
  });

  /** Blocks scripts and other sites that do not send an allowed Origin. Health checks are exempt. */
  function originGuard(req, res, next) {
    const origin = req.get('Origin');
    if (!origin) {
      if (req.path === '/api/health' || config.isDev) return next();
      return next(new AppError(403, 'Origin header required.'));
    }
    if (!isAllowed(origin)) return next(new AppError(403, 'Origin not allowed.'));
    return next();
  }

  return { corsMiddleware, originGuard, isAllowed };
}

module.exports = { createOriginPolicy };
