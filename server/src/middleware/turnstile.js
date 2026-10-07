const { AppError } = require('../utils/errors');

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

function createTurnstile({ secret, isDev, fetchImpl = (...args) => globalThis.fetch(...args) }) {
  return async function requireTurnstile(req, res, next) {
    try {
      if (!secret) {
        if (isDev) {
          console.warn('[WARN] TURNSTILE_SECRET_KEY is not set: CAPTCHA verification skipped (development only).');
          return next();
        }
        throw new AppError(500, 'Server misconfiguration: CAPTCHA is not configured.');
      }

      const token = req.body?.turnstileToken;
      if (typeof token !== 'string' || !token || token.length > 2048) {
        throw new AppError(400, 'Security check (CAPTCHA) token is required.');
      }

      let data;
      try {
        const response = await fetchImpl(VERIFY_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ secret, response: token }),
          signal: AbortSignal.timeout(8000),
        });
        data = await response.json();
      } catch (err) {
        throw new AppError(503, 'Could not verify the security check. Please try again.', { cause: err });
      }

      if (!data.success) throw new AppError(403, 'Security check (CAPTCHA) failed. Please try again.');
      return next();
    } catch (err) {
      return next(err);
    }
  };
}

module.exports = { createTurnstile };
