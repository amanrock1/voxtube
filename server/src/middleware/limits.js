const rateLimit = require('express-rate-limit');

const make = (defaults, overrides = {}) => {
  const { message, ...opts } = { ...defaults, ...overrides };
  return rateLimit({ standardHeaders: true, legacyHeaders: false, message: { error: message }, ...opts });
};

const createAnalyzeLimiter = (overrides) => make({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  message: 'Too many requests. Please wait a few minutes before trying again.',
}, overrides);

const createReadLimiter = (overrides) => make({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  message: 'Too many requests. Please slow down.',
}, overrides);

module.exports = { createAnalyzeLimiter, createReadLimiter };
