const DEFAULT_ORIGINS = ['https://voxtube-aman.vercel.app'];

function parseOrigins(raw) {
  return String(raw || '')
    .split(',')
    .map((s) => s.trim().replace(/\/+$/, ''))
    .filter(Boolean);
}

/** Validates the environment once at startup. Pure: does not read .env itself. */
function loadConfig(env = process.env) {
  const nodeEnv = env.NODE_ENV || 'production';
  const isDev = nodeEnv === 'development';

  const required = ['SUPABASE_URL', 'SUPABASE_KEY', 'GEMINI_API_KEY', 'YOUTUBE_API_KEY'];
  if (!isDev) required.push('TURNSTILE_SECRET_KEY');
  const missing = required.filter((k) => !env[k]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  const port = Number(env.PORT || 5000);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`Invalid PORT: ${env.PORT}`);
  }

  return Object.freeze({
    nodeEnv,
    isDev,
    port,
    supabaseUrl: env.SUPABASE_URL,
    supabaseKey: env.SUPABASE_KEY,
    geminiKey: env.GEMINI_API_KEY,
    youtubeKey: env.YOUTUBE_API_KEY,
    turnstileSecret: env.TURNSTILE_SECRET_KEY || '',
    allowedOrigins: [...new Set([...DEFAULT_ORIGINS, ...parseOrigins(env.FRONTEND_URL)])],
    geminiModels: [env.GEMINI_MODEL || 'gemini-2.5-flash-lite', env.GEMINI_FALLBACK_MODEL || 'gemini-2.5-flash'],
    cacheTtlMs: 7 * 24 * 60 * 60 * 1000,
  });
}

module.exports = { loadConfig };
