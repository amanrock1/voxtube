const test = require('node:test');
const assert = require('node:assert/strict');
const { extractRedditInfo, parseThread, createRedditService } = require('../src/services/redditService');
const { AppError } = require('../src/utils/errors');

const comment = (id, author, text, score, children = '') => `
<div class="thing comment" id="thing_t1_${id}" data-fullname="t1_${id}" data-author="${author}">
  <div class="entry">
    <p class="tagline"><span class="score unvoted" title="${score}">${score} points</span><time datetime="2026-01-01T00:00:00+00:00">x</time></p>
    <form class="usertext"><div class="usertext-body"><div class="md"><p>${text}</p></div></div></form>
  </div>
  ${children ? `<div class="child"><div class="sitetable">${children}</div></div>` : ''}
</div>`;
const page = (title, body) => `<html><body><a class="title" href="#">${title}</a><div id="siteTable"><div class="tagline"><time datetime="2026-02-02T00:00:00+00:00">x</time></div></div><div class="sitetable nestedlisting">${body}</div></body></html>`;
const info = { id: 'abc123', subreddit: 'techsupport' };

test('extractRedditInfo accepts real Reddit URLs', () => {
  for (const url of [
    'https://www.reddit.com/r/techsupport/comments/abc123/my_pc_wont_boot/',
    'https://old.reddit.com/r/techsupport/comments/abc123/',
    'http://reddit.com/r/techsupport/comments/abc123',
    'reddit.com/r/techsupport/comments/abc123/x',
    'https://m.reddit.com/r/techsupport/comments/abc123/x',
    'https://sh.reddit.com/r/techsupport/comments/abc123/x',
  ]) {
    assert.deepEqual(extractRedditInfo(url), { subreddit: 'techsupport', id: 'abc123' }, url);
  }
});

test('extractRedditInfo rejects spoofed and malformed URLs', () => {
  for (const url of [
    '', null, 'https://evil.com/?u=reddit.com/r/a/comments/b',
    'https://reddit.com.evil.com/r/a/comments/b',
    'https://www.reddit.com/r/techsupport/',
    'https://www.reddit.com/user/x/comments/abc123',
  ]) {
    assert.equal(extractRedditInfo(url), null, String(url));
  }
});

test('parseThread extracts title, subreddit, comments and reply hierarchy', () => {
  const html = page('Why does my PC &amp; monitor flicker?', [
    comment('a1', 'alice', 'Update the driver', 12, comment('b1', 'bob', 'That worked for me', 3) + comment('b2', 'carol', 'Did not help', 1)),
    comment('a2', 'dave', 'Replace the cable', 5),
  ].join(''));
  const { postDetails, comments } = parseThread(html, info);

  assert.equal(postDetails.id, 'abc123');
  assert.equal(postDetails.title, 'Why does my PC & monitor flicker?');
  assert.equal(postDetails.channel_title, 'r/techsupport');
  assert.equal(postDetails.published_at, '2026-02-02T00:00:00+00:00');

  assert.deepEqual(comments.map((c) => [c.id, c.parent_id]), [['a1', null], ['b1', 'a1'], ['b2', 'a1'], ['a2', null]]);
  const a1 = comments[0];
  assert.equal(a1.author_name, 'alice');
  assert.equal(a1.text, 'Update the driver');
  assert.equal(a1.like_count, 12);
  assert.equal(a1.author_profile_image, null);
});

test('parseThread skips deleted authors and empty bodies', () => {
  const html = page('T', comment('a1', '[deleted]', 'gone', 1) + comment('a2', 'eve', '', 1) + comment('a3', 'frank', 'kept', 1));
  assert.deepEqual(parseThread(html, info).comments.map((c) => c.id), ['a3']);
});

test('parseThread caps replies per top-level comment at 5', () => {
  const replies = Array.from({ length: 8 }, (_, i) => comment(`r${i}`, `u${i}`, `reply ${i}`, 1)).join('');
  const { comments } = parseThread(page('T', comment('a1', 'alice', 'root', 1, replies)), info);
  assert.equal(comments.length, 6);
});

test('parseThread caps the total at 150 comments', () => {
  const roots = Array.from({ length: 200 }, (_, i) => comment(`x${i}`, `u${i}`, `c${i}`, 1)).join('');
  assert.equal(parseThread(page('T', roots), info).comments.length, 150);
});

test('parseThread returns zero comments for a thread with none', () => {
  assert.deepEqual(parseThread(page('T', ''), info).comments, []);
});

test('parseThread rejects a page that is not a Reddit thread (block page)', () => {
  assert.throws(() => parseThread('<html><body>whoa there, pardner</body></html>', info), (e) => e instanceof AppError && e.status === 502);
});

function svc(res) {
  return createRedditService({ fetchImpl: async () => { if (res instanceof Error) throw res; return res; } });
}
const URL_OK = 'https://www.reddit.com/r/techsupport/comments/abc123/x/';

test('fetchRedditThread: invalid URL is a 400', async () => {
  await assert.rejects(svc({}).fetchRedditThread('https://example.com'), (e) => e.status === 400);
});

test('fetchRedditThread: 403/429 are reported as REDDIT_BLOCKED', async () => {
  for (const status of [403, 429]) {
    await assert.rejects(svc({ ok: false, status }).fetchRedditThread(URL_OK), (e) => e.status === 502 && e.code === 'REDDIT_BLOCKED');
  }
});

test('fetchRedditThread: 404 is a 404, other errors are 502', async () => {
  await assert.rejects(svc({ ok: false, status: 404 }).fetchRedditThread(URL_OK), (e) => e.status === 404);
  await assert.rejects(svc({ ok: false, status: 500 }).fetchRedditThread(URL_OK), (e) => e.status === 502);
});

test('fetchRedditThread: timeouts become 504, network errors 502', async () => {
  const timeout = Object.assign(new Error('t'), { name: 'TimeoutError' });
  await assert.rejects(svc(timeout).fetchRedditThread(URL_OK), (e) => e.status === 504);
  await assert.rejects(svc(new Error('fetch failed')).fetchRedditThread(URL_OK), (e) => e.status === 502);
});

test('fetchRedditThread returns parsed data on success', async () => {
  const html = page('Hello', comment('a1', 'alice', 'hi', 1));
  const out = await svc({ ok: true, status: 200, text: async () => html }).fetchRedditThread(URL_OK);
  assert.equal(out.postDetails.title, 'Hello');
  assert.equal(out.comments.length, 1);
});
