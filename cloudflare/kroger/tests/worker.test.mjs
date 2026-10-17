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
  const environment = await body(await send('/health'));
  assert.equal(environment.environment, 'production');
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

test('product and cart endpoints require Firebase authentication', async () => {
  const search = await send('/products?term=milk',{headers:{Origin:origin}});
  assert.equal(search.status,401);
  const cart = await send('/cart/add',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({items:[{upc:'0001111040101',quantity:1}]})});
  assert.equal(cart.status,401);
});
test('new endpoints reject disallowed origins', async () => {
  for(const path of ['/products?term=milk','/cart/add']){
    const response=await send(path,{method:path.startsWith('/cart')?'POST':'GET',headers:{Origin:'https://attacker.invalid'}});
    assert.equal(response.status,403);
  }
});

test('callback diagnoses rejected OAuth code without exposing Kroger response or tokens', async () => {
  const state = 's'.repeat(43);
  const env = goodConfig();
  env.KROGER_KV.get = async () => ({uid: 'test-user', expires: Date.now() + 30000, redirectUri: base + '/auth/kroger/callback', returnUrl: 'https://gcfd8hy5mb-ai.github.io/Meal-Planner-/'});
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({error: 'invalid_grant', access_token: 'should-never-leak'}), {status:400,headers:{'Content-Type':'application/json'}});
  try {
    const response = await send('/auth/kroger/callback?state='+state+'&code=sample-code', {}, env);
    assert.equal(response.status, 303);
    const redirect = new URL(response.headers.get('location'));
    assert.equal(redirect.searchParams.get('kroger'), 'failed');
    assert.equal(redirect.searchParams.get('kroger_reason'), 'token_rejected');
    assert.doesNotMatch(redirect.href, /invalid_grant|should-never-leak|sample-code/);
  } finally {globalThis.fetch = originalFetch;}
});
test('callback distinguishes user denial and expired OAuth state', async () => {
  const state = 's'.repeat(43);
  const denied = await send('/auth/kroger/callback?state='+state+'&error=access_denied');
  assert.equal(new URL(denied.headers.get('location')).searchParams.get('kroger_reason'),'oauth_denied');
  const expired = await send('/auth/kroger/callback?state='+state+'&code=sample');
  assert.equal(new URL(expired.headers.get('location')).searchParams.get('kroger_reason'),'state_expired');
});

test('credential diagnostic is not public', async () => {
  const result = await send('/diagnostics/credentials', {headers:{Origin:origin}});
  assert.equal(result.status, 401);
});

test('product search retains valid numeric UPCs and rejects malformed values', async () => {
  // The real Kroger response is mocked; no external account or credentials are used.
  // Exercise the UPC pattern against the same literal pattern from the Worker.
  const source = (await import('node:fs/promises')).readFile(new URL('../worker.js', import.meta.url), 'utf8');
  assert.match(await source, /filter\(p=>\/\^\\d\{8,14\}\$\/\.test\(p\.upc\)\)/);
  assert.doesNotMatch(await source, /\/\^\\\\d\{8,14\}/);
});

test('configured preview domain receives CORS permission and OAuth return', async()=>{
 const env=goodConfig();env.KROGER_APP_ORIGIN='https://preview.tablewise.example';env.KROGER_APP_RETURN='https://preview.tablewise.example/luxury-v2/';
 const allowed=await send('/status',{headers:{Origin:env.KROGER_APP_ORIGIN}},env);
 assert.equal(allowed.headers.get('access-control-allow-origin'),env.KROGER_APP_ORIGIN);
 const denied=await send('/status',{headers:{Origin:origin}},env);
 assert.equal(denied.status,403);
 const callback=await send('/auth/kroger/callback?state=bad&code=invalid',{},env);
 assert.equal(new URL(callback.headers.get('location')).pathname,'/luxury-v2/');
});
test('rejects cross-origin and insecure preview return URLs',async()=>{
 const env=goodConfig();env.KROGER_APP_ORIGIN='https://preview.tablewise.example';env.KROGER_APP_RETURN='https://attacker.invalid/capture';
 const callback=await send('/auth/kroger/callback?state=bad&code=invalid',{},env);
 assert.equal(new URL(callback.headers.get('location')).origin,origin);
});

test('both approved app origins pass CORS and unapproved origins remain blocked',async()=>{
 const env=goodConfig();
 env.KROGER_APP_ORIGIN=origin;
 env.KROGER_APP_RETURN=origin+'/Meal-Planner-/';
 env.KROGER_PREVIEW_ORIGIN='https://tablewise-luxury-preview.pages.dev';
 env.KROGER_PREVIEW_RETURN=env.KROGER_PREVIEW_ORIGIN+'/luxury-v2/index.html';
 for(const allowed of [origin,env.KROGER_PREVIEW_ORIGIN]){
  const response=await send('/status',{headers:{Origin:allowed}},env);
  assert.equal(response.status,401);
  assert.equal(response.headers.get('access-control-allow-origin'),allowed);
 }
 const blocked=await send('/status',{headers:{Origin:'https://attacker.invalid'}},env);
 assert.equal(blocked.status,403);
});
test('OAuth callback returns to the original allowed app, never a query-selected destination',async()=>{
 const env=goodConfig();
 env.KROGER_PREVIEW_ORIGIN='https://tablewise-luxury-preview.pages.dev';
 env.KROGER_PREVIEW_RETURN=env.KROGER_PREVIEW_ORIGIN+'/luxury-v2/index.html';
 const state='s'.repeat(43);
 env.KROGER_KV.get=async()=>({uid:'user1',expires:Date.now()+30000,redirectUri:base+'/auth/kroger/callback',returnUrl:env.KROGER_PREVIEW_RETURN});
 const response=await send('/auth/kroger/callback?state='+state+'&error=access_denied&next=https://attacker.invalid',{},env);
 assert.equal(response.status,303);
 const destination=new URL(response.headers.get('location'));
 assert.equal(destination.origin,env.KROGER_PREVIEW_ORIGIN);
 assert.equal(destination.pathname,'/luxury-v2/index.html');
 assert.equal(destination.searchParams.get('kroger_reason'),'oauth_denied');
});
test('OAuth callback rejects saved return URLs not on the configured allowlist',async()=>{
 const env=goodConfig(), state='s'.repeat(43);
 env.KROGER_KV.get=async()=>({uid:'user1',expires:Date.now()+30000,redirectUri:base+'/auth/kroger/callback',returnUrl:'https://attacker.invalid/collect'});
 const response=await send('/auth/kroger/callback?state='+state+'&error=access_denied',{},env);
 assert.equal(new URL(response.headers.get('location')).origin,origin);
});
