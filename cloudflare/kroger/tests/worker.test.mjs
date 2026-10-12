import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker.js';

const base = 'https://tablewise-kroger.example.workers.dev';
const origin = 'https://gcfd8hy5mb-ai.github.io';
const goodConfig = () => ({
  KROGER_KV: {get: async () => null, put: async () => {}, delete: async () => {}},
  KROGER_CLIENT_ID: 'test-client',
  KROGER_CLIENT_SECRET: 'test-secret',
  KROGER_TOKEN_ENCRYPTION_KEY: 'a'.repeat(64)
});
const send = (path, options = {}, env = goodConfig()) =>
  worker.fetch(new Request(base + path, options), env);
const body = async response => response.json();

test('health succeeds and reports readiness without disclosing secrets', async () => {
  const response = await send('/health');
  assert.equal(response.status, 200);
  assert.equal((await body(response)).ready, true);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});
test('missing bindings fail closed', async () => {
  const response = await send('/status', {headers: {Origin: origin}}, {});
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('access-control-allow-origin'), origin);
});
test('unauthenticated actions reject', async () => {
  for (const [path, method] of [['/connect','POST'], ['/status','GET'], ['/disconnect','POST']]) {
    const response = await send(path, {method, headers: {Origin: origin}});
    assert.equal(response.status, 401, path);
  }
});
test('foreign browser origins fail closed', async () => {
  const response = await send('/status', {headers: {Origin: 'https://attacker.invalid'}});
  assert.equal(response.status, 403);
  assert.equal(response.headers.get('access-control-allow-origin'), null);
});
test('preflight permits only expected origin', async () => {
  const allowed = await send('/connect', {method: 'OPTIONS', headers: {Origin: origin}});
  assert.equal(allowed.status, 204);
  assert.equal(allowed.headers.get('access-control-allow-origin'), origin);
  const blocked = await send('/connect', {method: 'OPTIONS', headers: {Origin: 'https://attacker.invalid'}});
  assert.equal(blocked.headers.get('access-control-allow-origin'), null);
});
test('invalid callback is redirected without touching KV', async () => {
  const response = await send('/auth/kroger/callback?state=bad&code=invalid');
  assert.equal(response.status, 303);
  assert.match(response.headers.get('location'), /kroger=failed/);
});
test('unknown paths respond 404', async () => {
  assert.equal((await send('/not-a-route')).status, 404);
});
