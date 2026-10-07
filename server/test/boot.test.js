const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');

const run = (env) => new Promise((resolve) => {
  const child = spawn(process.execPath, [path.join(__dirname, '../src/index.js')], {
    env: { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, ...env },
    cwd: path.join(__dirname, '..'),
  });
  let out = '';
  child.stdout.on('data', (d) => (out += d));
  child.stderr.on('data', (d) => (out += d));
  child.on('exit', (code) => resolve({ code, out }));
  setTimeout(() => child.kill(), 4000);
});

test('the server refuses to start when required variables are missing', async () => {
  const { code, out } = await run({ DOTENV_CONFIG_PATH: path.join(__dirname, 'no-such.env') });
  assert.equal(code, 1);
  assert.match(out, /STARTUP ERROR.*Missing required environment variables/);
});
