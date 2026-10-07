const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const RETRYABLE_MESSAGE = /\b(429|500|502|503|504)\b|fetch failed|ECONNRESET|ETIMEDOUT|overloaded|high demand|quota/i;

const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function isRetryable(err) {
  if (!err) return false;
  if (err.retryable === true) return true;
  if (RETRYABLE_STATUS.has(err.status)) return true;
  return RETRYABLE_MESSAGE.test(String(err.message || ''));
}

/** Runs fn, retrying transient failures with exponential backoff plus jitter. */
async function withRetry(fn, { retries = 3, baseDelayMs = 1000, sleep = defaultSleep, onRetry } = {}) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      if (attempt >= retries || !isRetryable(err)) throw err;
      const delay = baseDelayMs * 2 ** attempt + Math.floor(Math.random() * 250);
      if (onRetry) onRetry(err, attempt + 1, delay);
      await sleep(delay);
    }
  }
}

module.exports = { withRetry, isRetryable };
