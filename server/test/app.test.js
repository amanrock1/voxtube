const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');
const { createFakeSupabase } = require('./helpers/fakeSupabase');
const { AppError } = require('../src/utils/errors');

const ORIGIN = 'https://app.example';
const baseConfig = { isDev: false, allowedOrigins: [ORIGIN], turnstileSecret: 'secret' };

const captchaFetch = async (_url, opts) => ({
  json: async () => ({ success: new URLSearchParams(opts.body).get('response') === 'good' }),
});

async function start({ config = {}, analysis, supabase, limiterOptions, fetchImpl = captchaFetch } = {}) {
  const app = createApp({
    config: { ...baseConfig, ...config },
    supabase: supabase || createFakeSupabase(),
    analysis: analysis || { analyze: async () => ({ cached: false, video: { id: 'v' }, comments: [] }) },
    fetchImpl,
    limiterOptions,
  });
  const server = await new Promise((resolve) => { const s = app.listen(0, () => resolve(s)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (path, body, headers = {}) => fetch(base + path, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: ORIGIN, ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body),
  });
  const get = (path, headers = { Origin: ORIGIN }) => fetch(base + path, { headers });
  return { base, post, get, close: () => new Promise((r) => server.close(r)) };
}

const quiet = () => { const o = console.error; console.error = () => {}; return () => { console.error = o; }; };

test('health works without an Origin header', async () => {
  const s = await start();
  const res = await s.get('/api/health', {});
  assert.equal(res.status, 200);
  assert.equal((await res.json()).status, 'healthy');
  await s.close();
});

test('other routes need an allowed Origin (JSON 403, not an HTML stack trace)', async () => {
  const s = await start();
  let res = await s.get('/api/videos', {});
  assert.equal(res.status, 403);
  assert.match(res.headers.get('content-type'), /json/);
  res = await s.get('/api/videos', { Origin: 'https://evil.example' });
  assert.equal(res.status, 403);
  res = await s.get('/api/videos', { Origin: 'http://localhost:5173' });
  assert.equal(res.status, 403, 'localhost is not trusted outside development');
  res = await s.get('/api/videos');
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('access-control-allow-origin'), ORIGIN);
  await s.close();
});

test('development allows localhost origins and Origin-less requests', async () => {
  const s = await start({ config: { isDev: true } });
  assert.equal((await s.get('/api/videos', { Origin: 'http://localhost:5173' })).status, 200);
  assert.equal((await s.get('/api/videos', {})).status, 200);
  await s.close();
});

test('analyze: token required, bad token rejected, good token accepted', async () => {
  const s = await start();
  assert.equal((await s.post('/api/analyze', { url: 'x' })).status, 400);
  assert.equal((await s.post('/api/analyze', { url: 'x', turnstileToken: 'bad' })).status, 403);
  assert.equal((await s.post('/api/analyze', { url: 'x', turnstileToken: 12345 })).status, 400);
  const ok = await s.post('/api/analyze', { url: 'https://youtu.be/dQw4w9WgXcQ', turnstileToken: 'good' });
  assert.equal(ok.status, 200);
  assert.equal((await ok.json()).video.id, 'v');
  await s.close();
});

test('the rate limiter runs BEFORE the CAPTCHA check, so failed attempts are counted', async () => {
  const s = await start({ limiterOptions: { analyze: { limit: 2 } } });
  const attempt = () => s.post('/api/analyze', { url: 'x', turnstileToken: 'bad' });
  assert.equal((await attempt()).status, 403);
  assert.equal((await attempt()).status, 403);
  const third = await attempt();
  assert.equal(third.status, 429);
  assert.match((await third.json()).error, /Too many requests/);
  await s.close();
});

test('CAPTCHA fails closed when no secret is configured outside development', async () => {
  const restore = quiet();
  const s = await start({ config: { turnstileSecret: '' } });
  const res = await s.post('/api/analyze', { url: 'x', turnstileToken: 'good' });
  assert.equal(res.status, 500);
  await s.close();
  restore();
});

test('in development with no secret the CAPTCHA is skipped', async () => {
  const warn = console.warn; console.warn = () => {};
  const s = await start({ config: { isDev: true, turnstileSecret: '' } });
  const res = await s.post('/api/analyze', { url: 'https://youtu.be/dQw4w9WgXcQ' }, { Origin: 'http://localhost:5173' });
  assert.equal(res.status, 200);
  await s.close();
  console.warn = warn;
});

test('a Turnstile outage is a 503, not a crash', async () => {
  const restore = quiet();
  const s = await start({ fetchImpl: async () => { throw new Error('network down'); } });
  assert.equal((await s.post('/api/analyze', { url: 'x', turnstileToken: 'good' })).status, 503);
  await s.close();
  restore();
});

test('url validation: missing, wrong type and too long', async () => {
  const s = await start();
  const t = { turnstileToken: 'good' };
  assert.equal((await s.post('/api/analyze', { ...t })).status, 400);
  assert.equal((await s.post('/api/analyze', { ...t, url: 123 })).status, 400);
  assert.equal((await s.post('/api/analyze', { ...t, url: 'a'.repeat(501) })).status, 400);
  await s.close();
});

test('malformed JSON is a 400 and an oversized body is a 413, both as JSON', async () => {
  const s = await start();
  const bad = await s.post('/api/analyze', '{not json');
  assert.equal(bad.status, 400);
  assert.ok((await bad.json()).error);
  const big = await s.post('/api/analyze', JSON.stringify({ url: 'a'.repeat(20000) }));
  assert.equal(big.status, 413);
  await s.close();
});

test('AppError messages reach the client; unexpected errors do not leak details', async () => {
  const restore = quiet();
  let mode = 'app';
  const analysis = { analyze: async () => { throw mode === 'app' ? new AppError(400, 'Comments are disabled for this YouTube video.') : new Error('secret db password leaked'); } };
  const s = await start({ analysis });
  const body = { url: 'x', turnstileToken: 'good' };
  let res = await s.post('/api/analyze', body);
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error, 'Comments are disabled for this YouTube video.');
  mode = 'boom';
  res = await s.post('/api/analyze', body);
  assert.equal(res.status, 500);
  assert.ok(!JSON.stringify(await res.json()).includes('secret'));
  await s.close();
  restore();
});

test('GET /api/videos/:id validates the id and 404s when missing', async () => {
  const supabase = createFakeSupabase({ videos: [{ id: 'abc_123-x', title: 'T' }], comments: [{ id: 'c1', video_id: 'abc_123-x' }] });
  const s = await start({ supabase });
  assert.equal((await s.get('/api/videos/bad%20id!')).status, 400);
  assert.equal((await s.get('/api/videos/nope')).status, 404);
  const ok = await s.get('/api/videos/abc_123-x');
  assert.equal(ok.status, 200);
  const data = await ok.json();
  assert.equal(data.video.id, 'abc_123-x');
  assert.equal(data.comments.length, 1);
  await s.close();
});

test('unknown routes are a JSON 404', async () => {
  const s = await start();
  const res = await s.get('/api/nope');
  assert.equal(res.status, 404);
  assert.ok((await res.json()).error);
  await s.close();
});
