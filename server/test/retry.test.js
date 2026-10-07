const test = require('node:test');
const assert = require('node:assert/strict');
const { withRetry, isRetryable } = require('../src/utils/retry');

const noSleep = async () => {};

test('isRetryable recognises transient failures only', () => {
  assert.equal(isRetryable({ status: 429 }), true);
  assert.equal(isRetryable({ status: 503 }), true);
  assert.equal(isRetryable(new Error('fetch failed')), true);
  assert.equal(isRetryable(new Error('[503 Service Unavailable] model is overloaded')), true);
  assert.equal(isRetryable(Object.assign(new Error('bad json'), { retryable: true })), true);
  assert.equal(isRetryable({ status: 404 }), false);
  assert.equal(isRetryable(new Error('API key not valid')), false);
  assert.equal(isRetryable(null), false);
});

test('retries a transient error and then succeeds', async () => {
  let calls = 0;
  const result = await withRetry(async () => {
    calls++;
    if (calls < 3) throw Object.assign(new Error('x'), { status: 503 });
    return 'ok';
  }, { retries: 3, sleep: noSleep });
  assert.equal(result, 'ok');
  assert.equal(calls, 3);
});

test('does not retry a non-retryable error', async () => {
  let calls = 0;
  await assert.rejects(
    withRetry(async () => { calls++; throw Object.assign(new Error('nope'), { status: 404 }); }, { sleep: noSleep }),
    /nope/
  );
  assert.equal(calls, 1);
});

test('gives up after the retry budget and rethrows the last error', async () => {
  let calls = 0;
  await assert.rejects(
    withRetry(async () => { calls++; throw Object.assign(new Error('still down'), { status: 503 }); }, { retries: 2, sleep: noSleep }),
    /still down/
  );
  assert.equal(calls, 3);
});

test('backs off exponentially', async () => {
  const delays = [];
  await assert.rejects(
    withRetry(async () => { throw Object.assign(new Error('x'), { status: 503 }); }, {
      retries: 3, baseDelayMs: 1000, sleep: async (ms) => { delays.push(ms); },
    })
  );
  assert.equal(delays.length, 3);
  assert.ok(delays[0] >= 1000 && delays[0] < 1250);
  assert.ok(delays[1] >= 2000 && delays[1] < 2250);
  assert.ok(delays[2] >= 4000 && delays[2] < 4250);
});
