// Kroger OAuth Worker for Tablewise. Do not commit Cloudflare secret values.
const APP_ORIGIN = 'https://gcfd8hy5mb-ai.github.io';
const APP_RETURN = 'https://gcfd8hy5mb-ai.github.io/Meal-Planner-/';
const FIREBASE_PROJECT = 'meal-planner-a478e';
const KROGER_BASE = 'https://api-ce.kroger.com';
const CALLBACK_PATH = '/auth/kroger/callback';
const encoder = new TextEncoder();
const json = (value, status = 200, origin = '') => new Response(JSON.stringify(value), {
  status, headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...(origin ? {'Access-Control-Allow-Origin': origin, 'Vary': 'Origin'} : {})
  }
});
const toB64url = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64url = v => Uint8Array.from(atob(v.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - v.length % 4) % 4)), x => x.charCodeAt(0));
const rand = (n = 32) => toB64url(crypto.getRandomValues(new Uint8Array(n)));
const decodeJson = str => JSON.parse(new TextDecoder().decode(fromB64url(str)));
const validConfig = env => !!(env.KROGER_KV && env.KROGER_CLIENT_ID && env.KROGER_CLIENT_SECRET && /^[a-f0-9]{64}$/i.test(env.KROGER_TOKEN_ENCRYPTION_KEY || ''));
async function tokenKey(env) {
  const bytes = new Uint8Array(env.KROGER_TOKEN_ENCRYPTION_KEY.match(/.{2}/g).map(h => parseInt(h, 16)));
  return crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
}
async function encrypt(env, value) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({name: 'AES-GCM', iv}, await tokenKey(env), encoder.encode(JSON.stringify(value)));
  return JSON.stringify({v: 1, iv: toB64url(iv), data: toB64url(new Uint8Array(encrypted))});
}
async function decrypt(env, stored) {
  const p = JSON.parse(stored);
  if (p.v !== 1) throw Error('Unsupported encryption version');
  const plaintext = await crypto.subtle.decrypt({name: 'AES-GCM', iv: fromB64url(p.iv)}, await tokenKey(env), fromB64url(p.data));
  return JSON.parse(new TextDecoder().decode(plaintext));
}
let jwksCache = null, jwksUntil = 0;
async function firebaseUser(request) {
  const bearer = /^Bearer (\S+)$/.exec(request.headers.get('Authorization') || '');
  if (!bearer) throw Error('Authentication required');
  const jwt = bearer[1], parts = jwt.split('.');
  if (parts.length !== 3 || jwt.length > 15000) throw Error('Invalid authentication');
  let header, body;
  try { header = decodeJson(parts[0]); body = decodeJson(parts[1]); } catch { throw Error('Invalid authentication'); }
  const now = Math.floor(Date.now() / 1000);
  if (header.alg !== 'RS256' || typeof header.kid !== 'string' || !body.sub || typeof body.sub !== 'string' ||
      body.sub.length > 128 || body.aud !== FIREBASE_PROJECT ||
      body.iss !== `https://securetoken.google.com/${FIREBASE_PROJECT}` ||
      !Number.isFinite(body.iat) || !Number.isFinite(body.exp) ||
      !Number.isFinite(body.auth_time) || body.exp <= now || body.iat > now ||
      body.auth_time > now || body.exp - body.iat > 7200)
    throw Error('Invalid authentication');
  if (!jwksCache || Date.now() > jwksUntil) {
    const response = await fetch('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com');
    if (!response.ok) throw Error('Authentication temporarily unavailable');
    jwksCache = (await response.json()).keys;
    jwksUntil = Date.now() + 30 * 60 * 1000;
  }
  const jwk = jwksCache.find(k => k.kid === header.kid && k.kty === 'RSA');
  if (!jwk) throw Error('Invalid authentication');
  const key = await crypto.subtle.importKey('jwk', jwk, {name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256'}, false, ['verify']);
  const verified = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, fromB64url(parts[2]), encoder.encode(parts[0] + '.' + parts[1]));
  if (!verified) throw Error('Invalid authentication');
  return body.sub;
}
function redirectUri(request) { return new URL(CALLBACK_PATH, new URL(request.url).origin).href; }
async function krogerToken(env, params) {
  const auth = btoa(env.KROGER_CLIENT_ID + ':' + env.KROGER_CLIENT_SECRET);
  const res = await fetch(`${KROGER_BASE}/v1/connect/oauth2/token`, {
    method: 'POST',
    headers: {Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json'},
    body: new URLSearchParams(params)
  });
  const response = await res.json().catch(() => ({}));
  if (!res.ok || !response.access_token) throw Error('Kroger authorization failed');
  return response;
}
function redirectBack(outcome) {
  const url = new URL(APP_RETURN);
  url.searchParams.set('kroger', outcome);
  return Response.redirect(url.href, 303);
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url), path = url.pathname;
    const origin = request.headers.get('Origin') || '';
    const cors = origin === APP_ORIGIN ? APP_ORIGIN : '';
    if (request.method === 'OPTIONS') {
      return new Response(null, {status: 204, headers: {
        ...(cors ? {'Access-Control-Allow-Origin': cors, Vary: 'Origin'} : {}),
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        'Access-Control-Max-Age': '600'
      }});
    }
    if (path === '/health' && request.method === 'GET')
      return json({service: 'tablewise-kroger', ready: validConfig(env), environment: 'certification'});
    if (!validConfig(env))
      return json({error: 'Backend configuration incomplete'}, 503, cors);
    if (path === CALLBACK_PATH && request.method === 'GET') {
      const state = url.searchParams.get('state') || '';
      const code = url.searchParams.get('code') || '';
      if (!/^[a-zA-Z0-9_-]{32,128}$/.test(state) || !code || code.length > 4096 || url.searchParams.has('error'))
        return redirectBack('failed');
      const saved = await env.KROGER_KV.get('oauth:' + state, 'json');
      if (!saved || saved.expires < Date.now() || !saved.uid || saved.redirectUri !== redirectUri(request))
        return redirectBack('expired');
      await env.KROGER_KV.delete('oauth:' + state);
      try {
        const result = await krogerToken(env, {grant_type: 'authorization_code', code, redirect_uri: saved.redirectUri});
        await env.KROGER_KV.put('token:' + saved.uid, await encrypt(env, {
          access_token: result.access_token, refresh_token: result.refresh_token || null,
          scope: result.scope || '',
          expires: Date.now() + Math.max(0, (Number(result.expires_in) || 0) - 60) * 1000,
          connectedAt: Date.now()
        }));
        return redirectBack('connected');
      } catch { return redirectBack('failed'); }
    }
    if (!['/connect', '/status', '/disconnect'].includes(path))
      return json({error: 'Not found'}, 404, cors);
    if (origin && origin !== APP_ORIGIN)
      return json({error: 'Origin not allowed'}, 403);
    let uid;
    try { uid = await firebaseUser(request); }
    catch { return json({error: 'Valid Tablewise sign-in required'}, 401, cors); }
    if (path === '/status' && request.method === 'GET') {
      const stored = await env.KROGER_KV.get('token:' + uid);
      if (!stored) return json({connected: false}, 200, cors);
      try {
        const data = await decrypt(env, stored);
        return json({connected: !!data.refresh_token || data.expires > Date.now(),
          connectedAt: data.connectedAt || null}, 200, cors);
      } catch {
        return json({error: 'Saved Kroger connection is unavailable. Reconnect your account.'}, 409, cors);
      }
    }
    if (path === '/disconnect' && request.method === 'POST') {
      await env.KROGER_KV.delete('token:' + uid);
      return json({connected: false}, 200, cors);
    }
    if (path === '/connect' && request.method === 'POST') {
      const state = rand(32), uri = redirectUri(request);
      await env.KROGER_KV.put('oauth:' + state, JSON.stringify({
        uid, expires: Date.now() + 10 * 60 * 1000, redirectUri: uri
      }), {expirationTtl: 600});
      const auth = new URL(`${KROGER_BASE}/v1/connect/oauth2/authorize`);
      auth.search = new URLSearchParams({
        response_type: 'code', client_id: env.KROGER_CLIENT_ID,
        redirect_uri: uri, scope: 'cart.basic:write', state
      }).toString();
      return json({authorizationUrl: auth.href}, 200, cors);
    }
    return json({error: 'Method not allowed'}, 405, cors);
  }
};