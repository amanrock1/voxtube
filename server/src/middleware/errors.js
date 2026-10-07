const { AppError } = require('../utils/errors');

function notFound(req, res, next) {
  next(new AppError(404, 'Not found'));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err instanceof AppError) {
    if (err.status >= 500) console.error(`[ERROR] ${err.message}`, err.cause?.message || '');
    return res.status(err.status).json({ error: err.message });
  }
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Request body too large.' });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body.' });

  console.error('[ERROR] Unexpected:', err);
  return res.status(500).json({ error: 'An unexpected error occurred. Please try again.' });
}

module.exports = { notFound, errorHandler };
