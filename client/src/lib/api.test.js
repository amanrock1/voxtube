import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeUrl } from './api.js';

const res = (status, body, json = true) => ({ ok: status < 400, status, json: async () => { if (!json) throw new Error('not json'); return body; } });
const opts = (fetchImpl) => ({ fetchImpl, base: 'http://x/api' });

test('analyzeUrl posts url and token and returns the data', async () => {
  let seen;
  const data = { video: { id: 'v' }, comments: [] };
  const out = await analyzeUrl('https://youtu.be/abc', 'tok', opts(async (url, init) => { seen = { url, init }; return res(200, data); }));
  assert.deepEqual(out, data);
  assert.equal(seen.url, 'http://x/api/analyze');
  assert.deepEqual(JSON.parse(seen.init.body), { url: 'https://youtu.be/abc', turnstileToken: 'tok' });
});

test('analyzeUrl surfaces the server error message', async () => {
  await assert.rejects(analyzeUrl('u', 't', opts(async () => res(400, { error: 'Comments are disabled.' }))), /Comments are disabled\./);
});

test('analyzeUrl handles non-JSON error bodies (e.g. a proxy HTML page)', async () => {
  await assert.rejects(analyzeUrl('u', 't', opts(async () => res(502, null, false))), /HTTP 502/);
});

test('analyzeUrl turns a network failure into a friendly message', async () => {
  await assert.rejects(analyzeUrl('u', 't', opts(async () => { throw new TypeError('Failed to fetch'); })), /Could not reach the server/);
});

test('analyzeUrl rejects a malformed success payload', async () => {
  await assert.rejects(analyzeUrl('u', 't', opts(async () => res(200, { nope: true }))), /unexpected response/);
});
