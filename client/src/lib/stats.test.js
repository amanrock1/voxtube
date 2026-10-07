import test from 'node:test';
import assert from 'node:assert/strict';
import { computeStats } from './stats.js';

const c = (sentiment, category) => ({ sentiment, category });

test('computeStats counts and rounds percentages', () => {
  const s = computeStats([c('Positive', 'Praise'), c('Positive', 'Question'), c('Negative', 'Noise'), c('Neutral', 'Feedback')]);
  assert.equal(s.n, 4);
  assert.deepEqual(s.sentCount, { Positive: 2, Neutral: 1, Negative: 1 });
  assert.equal(s.posRate, 50);
  assert.equal(s.qRate, 25);
  assert.deepEqual(s.sentData.map((d) => d.value), [2, 1, 1]);
  assert.deepEqual(s.catData.map((d) => d.name), ['Praise', 'Questions', 'Feedback', 'Noise']);
});

test('computeStats of no comments is all zeros (no NaN)', () => {
  const s = computeStats([]);
  assert.equal(s.n, 0);
  assert.equal(s.posRate, 0);
  assert.equal(s.qRate, 0);
});

test('computeStats ignores unknown labels, including prototype keys', () => {
  const s = computeStats([c('constructor', '__proto__'), c('Positive', 'Praise')]);
  assert.equal(s.sentCount.Positive, 1);
  assert.equal(s.n, 2);
  assert.ok(Object.values(s.sentCount).every(Number.isFinite));
});
