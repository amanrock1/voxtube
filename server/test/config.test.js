const test = require('node:test');
const assert = require('node:assert/strict');
const { loadConfig } = require('../src/config');

const base = {
  SUPABASE_URL: 'https://x.supabase.co',
  SUPABASE_KEY: 'k',
  GEMINI_API_KEY: 'g',
  YOUTUBE_API_KEY: 'y',
  TURNSTILE_SECRET_KEY: 't',
};

test('throws and lists every missing variable', () => {
  assert.throws(() => loadConfig({}), /SUPABASE_URL.*SUPABASE_KEY.*GEMINI_API_KEY.*YOUTUBE_API_KEY.*TURNSTILE_SECRET_KEY/);
});

test('turnstile secret is required unless NODE_ENV=development', () => {
  const { TURNSTILE_SECRET_KEY, ...rest } = base;
  assert.throws(() => loadConfig(rest), /TURNSTILE_SECRET_KEY/);
  assert.throws(() => loadConfig({ ...rest, NODE_ENV: 'production' }), /TURNSTILE_SECRET_KEY/);
  assert.doesNotThrow(() => loadConfig({ ...rest, NODE_ENV: 'development' }));
});

test('defaults: production behaviour, port 5000, pinned models, 7 day cache', () => {
  const c = loadConfig(base);
  assert.equal(c.nodeEnv, 'production');
  assert.equal(c.isDev, false);
  assert.equal(c.port, 5000);
  assert.deepEqual(c.geminiModels, ['gemini-2.5-flash-lite', 'gemini-2.5-flash']);
  assert.equal(c.cacheTtlMs, 7 * 24 * 60 * 60 * 1000);
});

test('FRONTEND_URL accepts a comma list and strips trailing slashes', () => {
  const c = loadConfig({ ...base, FRONTEND_URL: 'https://a.example/, https://b.example' });
  assert.ok(c.allowedOrigins.includes('https://a.example'));
  assert.ok(c.allowedOrigins.includes('https://b.example'));
  assert.ok(c.allowedOrigins.includes('https://voxtube-aman.vercel.app'));
});

test('rejects an invalid PORT', () => {
  assert.throws(() => loadConfig({ ...base, PORT: 'abc' }), /Invalid PORT/);
  assert.equal(loadConfig({ ...base, PORT: '8080' }).port, 8080);
});

test('GEMINI_MODEL and GEMINI_FALLBACK_MODEL override the defaults', () => {
  const c = loadConfig({ ...base, GEMINI_MODEL: 'm1', GEMINI_FALLBACK_MODEL: 'm2' });
  assert.deepEqual(c.geminiModels, ['m1', 'm2']);
});
