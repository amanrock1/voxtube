const test = require('node:test');
const assert = require('node:assert/strict');
const { createAiService } = require('../src/services/aiService');
const { AppError } = require('../src/utils/errors');

const noSleep = async () => {};
const MODELS = ['primary', 'fallback'];
const mk = (n, extra = {}) => Array.from({ length: n }, (_, i) => ({ id: `id${i}`, text: `comment ${i}`, like_count: i, ...extra }));

/** Builds a Gemini-style JSON answer for the indexes found in the prompt. */
function answerFor(prompt, { sCode = 'POS', cCode = 'PR' } = {}) {
  const idxs = [...prompt.matchAll(/^ID: (\d+)$/gm)].map((m) => m[1]);
  return JSON.stringify(idxs.map((id) => ({ id, sCode, cCode })));
}

function service(generate, retries = 2) {
  return createAiService({ generate, models: MODELS, sleep: noSleep, retries });
}

// The service logs failures with console.warn; keep test output readable.
const warn = console.warn;
test.before(() => { console.warn = () => {}; });
test.after(() => { console.warn = warn; });

test('classifyComments chunks by 50 and keeps order and original ids', async () => {
  const prompts = [];
  const ai = service(async ({ prompt, json }) => { prompts.push(prompt); assert.equal(json, true); return answerFor(prompt); });
  const out = await ai.classifyComments(mk(120));
  assert.equal(prompts.length, 3);
  assert.equal(out.length, 120);
  assert.deepEqual(out[0], { id: 'id0', sentiment: 'Positive', category: 'Praise' });
  assert.equal(out[119].id, 'id119');
});

test('classifyComments decodes every label code', async () => {
  const ai = service(async () => JSON.stringify([
    { id: '0', sCode: 'POS', cCode: 'Q' }, { id: '1', sCode: 'NEU', cCode: 'F' }, { id: '2', sCode: 'NEG', cCode: 'NO' },
  ]));
  const out = await ai.classifyComments(mk(3));
  assert.deepEqual(out.map((o) => [o.sentiment, o.category]), [['Positive', 'Question'], ['Neutral', 'Feedback'], ['Negative', 'Noise']]);
});

test('classifyComments on an empty list makes no calls', async () => {
  const ai = service(async () => { throw new Error('should not be called'); });
  assert.deepEqual(await ai.classifyComments([]), []);
});

test('a partial answer (missing items) is retried and then fails loudly instead of inventing labels', async () => {
  let calls = 0;
  const ai = service(async () => { calls++; return JSON.stringify([{ id: '0', sCode: 'POS', cCode: 'PR' }]); });
  await assert.rejects(ai.classifyComments(mk(3)), (e) => e instanceof AppError && e.status === 502);
  assert.equal(calls, 6); // (1 try + 2 retries) x 2 models
});

test('an unknown label code or invalid JSON is rejected, never defaulted', async () => {
  const bad1 = service(async () => JSON.stringify([{ id: '0', sCode: 'WAT', cCode: 'PR' }]));
  await assert.rejects(bad1.classifyComments(mk(1)), (e) => e.status === 502);
  const bad2 = service(async () => 'not json at all');
  await assert.rejects(bad2.classifyComments(mk(1)), (e) => e.status === 502);
  const bad3 = service(async () => '{"id":"0"}');
  await assert.rejects(bad3.classifyComments(mk(1)), (e) => e.status === 502);
});

test('extra items beyond the chunk are ignored', async () => {
  const ai = service(async () => JSON.stringify([
    { id: '0', sCode: 'POS', cCode: 'PR' }, { id: '99', sCode: 'POS', cCode: 'PR' },
  ]));
  assert.equal((await ai.classifyComments(mk(1))).length, 1);
});

test('transient errors are retried on the same model', async () => {
  const seen = [];
  let calls = 0;
  const ai = service(async ({ model, prompt }) => {
    seen.push(model); calls++;
    if (calls < 3) throw Object.assign(new Error('overloaded'), { status: 503 });
    return answerFor(prompt);
  });
  await ai.classifyComments(mk(2));
  assert.deepEqual(seen, ['primary', 'primary', 'primary']);
});

test('a non-retryable error on the primary model falls back to the second model', async () => {
  const seen = [];
  const ai = service(async ({ model, prompt }) => {
    seen.push(model);
    if (model === 'primary') throw Object.assign(new Error('model not found'), { status: 404 });
    return answerFor(prompt);
  });
  await ai.classifyComments(mk(2));
  assert.deepEqual(seen, ['primary', 'fallback']);
});

test('null, empty and very long comment text never crash and long text is truncated', async () => {
  let prompt = '';
  const ai = service(async (req) => { prompt = req.prompt; return answerFor(req.prompt); });
  const comments = [
    { id: 'a', text: null, like_count: 0 },
    { id: 'b', text: '', like_count: 0 },
    { id: 'c', text: 'x'.repeat(5000), like_count: 0 },
  ];
  assert.equal((await ai.classifyComments(comments)).length, 3);
  assert.ok(!prompt.includes('x'.repeat(1001)));
  assert.ok(prompt.includes('x'.repeat(1000)));
});

test('video summary uses the most-liked comments and returns trimmed text', async () => {
  let prompt = '';
  const ai = service(async (req) => { prompt = req.prompt; return '  ### Audience Sentiment & Feedback Summary\n* x  '; });
  const summary = await ai.generateVideoSummary(mk(200));
  assert.equal(summary, '### Audience Sentiment & Feedback Summary\n* x');
  assert.ok(prompt.includes('comment 199'));
  assert.ok(!prompt.includes('- comment 0\n'));
});

test('video summary of no comments is a fixed message with no API call', async () => {
  const ai = service(async () => { throw new Error('no call expected'); });
  assert.equal(await ai.generateVideoSummary([]), 'No comments available to summarize.');
});

test('summaries throw an AppError on persistent failure instead of returning an error string', async () => {
  const ai = service(async () => { throw Object.assign(new Error('down'), { status: 503 }); });
  await assert.rejects(ai.generateVideoSummary(mk(3)), (e) => e instanceof AppError && e.status === 502);
  await assert.rejects(ai.generateRedditSummary('T', mk(3)), (e) => e instanceof AppError && e.status === 502);
});

test('an empty summary text is treated as a failure', async () => {
  const ai = service(async () => '   ');
  await assert.rejects(ai.generateVideoSummary(mk(3)), (e) => e.status === 502);
});

test('reddit summary nests replies under their parent comment', async () => {
  let prompt = '';
  const ai = service(async (req) => { prompt = req.prompt; return '### ok'; });
  const comments = [
    { id: 'reddit_c_a1', text: 'Update the driver', like_count: 10, parent_id: null },
    { id: 'reddit_c_b1', text: 'That worked for me', like_count: 2, parent_id: 'reddit_c_a1' },
  ];
  await ai.generateRedditSummary('PC flickers', comments);
  assert.match(prompt, /\[Solution\/Advice\] \(Score: 10\): Update the driver\n\s+↳ \[Community Reply\] \(Score: 2\): That worked for me/);
  assert.ok(!prompt.includes('[Solution/Advice] (Score: 2)'));
  assert.ok(prompt.includes('PC flickers'));
});
