const test = require('node:test');
const assert = require('node:assert/strict');
const { getCacheProblem } = require('../src/utils/cachePolicy');

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse('2026-10-07T00:00:00Z');
const video = (over = {}) => ({ id: 'v', summary: '### Summary', created_at: new Date(NOW - DAY).toISOString(), ...over });
const comments = (n, sentiment = 'Positive', category = 'Praise') => Array.from({ length: n }, (_, i) => ({ id: `c${i}`, sentiment, category }));
const check = (v, c, ttlMs = 7 * DAY) => getCacheProblem({ video: v, comments: c, now: NOW, ttlMs });

test('a healthy fresh record is usable', () => {
  assert.equal(check(video(), comments(20)), null);
});

test('missing or legacy-failed summaries are rejected', () => {
  assert.equal(check(video({ summary: null }), comments(5)), 'missing-summary');
  assert.equal(check(video({ summary: '' }), comments(5)), 'missing-summary');
  for (const s of ['Error generating comment summary.', 'Failed to generate summary.', 'Error generating troubleshooting summary from Reddit threads.']) {
    assert.equal(check(video({ summary: s }), comments(5)), 'failed-summary', s);
  }
});

test('records older than the TTL are stale', () => {
  assert.equal(check(video({ created_at: new Date(NOW - 8 * DAY).toISOString() }), comments(5)), 'stale');
  assert.equal(check(video({ created_at: new Date(NOW - 6 * DAY).toISOString() }), comments(5)), null);
  assert.equal(check(video({ created_at: new Date(NOW - 400 * DAY).toISOString() }), comments(5), Infinity), null);
});

test('no comments is only fine for the "no comments" fallback summaries', () => {
  assert.equal(check(video(), []), 'missing-comments');
  assert.equal(check(video({ summary: 'This video has no comments to analyze.' }), []), null);
  assert.equal(check(video({ summary: 'This thread has no comments to analyze.' }), []), null);
});

test('10+ comments that are all Neutral/Noise are the signature of the old AI-failure bug', () => {
  assert.equal(check(video(), comments(12, 'Neutral', 'Noise')), 'unclassified');
  assert.equal(check(video(), comments(9, 'Neutral', 'Noise')), null);
  assert.equal(check(video(), [...comments(11, 'Neutral', 'Noise'), ...comments(1)]), null);
});

test('a record without created_at is not treated as stale', () => {
  assert.equal(check(video({ created_at: undefined }), comments(5)), null);
});
