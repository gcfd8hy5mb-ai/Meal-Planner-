// Kroger OAuth Worker for Tablewise. Do not commit Cloudflare secret values.
const APP_ORIGIN = 'https://gcfd8hy5mb-ai.github.io';
const APP_RETURN = 'https://gcfd8hy5mb-ai.github.io/Meal-Planner-/';
const FIREBASE_PROJECT = 'meal-planner-a478e';
// Default to the existing certification credentials until an explicit, coordinated cutover.
const KROGER_ENVIRONMENT = 'production';
const KROGER_BASE = KROGER_ENVIRONMENT === 'production'
  ? 'https://api.kroger.com'
  : 'https://api-ce.kroger.com';
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
  if (!res.ok || !response.access_token) {
    const error = new Error('Kroger authorization failed');
    // Only an allowlisted failure category may reach the browser. Never include Kroger response text.
    error.oauthReason = !res.ok
      ? (res.status === 400 ? 'token_rejected' : res.status === 401 ? 'client_rejected' : res.status === 403 ? 'access_denied' : 'token_service')
      : 'token_missing';
    throw error;
  }
  return response;
}
async function userAccessToken(env, uid) {
 const encrypted=await env.KROGER_KV.get('token:'+uid);
 if(!encrypted)return null;
 const saved=await decrypt(env,encrypted);
 if(saved.expires>Date.now()+30000)return saved.access_token;
 if(!saved.refresh_token)throw Error('Reconnect required');
 const renewed=await krogerToken(env,{grant_type:'refresh_token',refresh_token:saved.refresh_token});
 const next={...saved,access_token:renewed.access_token,refresh_token:renewed.refresh_token||saved.refresh_token,expires:Date.now()+Math.max(0,(Number(renewed.expires_in)||0)-60)*1000};
 await env.KROGER_KV.put('token:'+uid,await encrypt(env,next));
 return next.access_token;
}
function redirectBack(outcome, reason = '') {
  const url = new URL(APP_RETURN);
  url.searchParams.set('kroger', outcome);
  if (['oauth_denied','invalid_callback','state_expired','token_rejected','client_rejected','access_denied','token_service','token_missing','token_network','storage_failed'].includes(reason))
    url.searchParams.set('kroger_reason', reason);
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
      return json({service: 'tablewise-kroger', ready: validConfig(env), environment: KROGER_ENVIRONMENT});
    if (!validConfig(env))
      return json({error: 'Backend configuration incomplete'}, 503, cors);
    if (path === CALLBACK_PATH && request.method === 'GET') {
      const state = url.searchParams.get('state') || '';
      const code = url.searchParams.get('code') || '';
      if (url.searchParams.has('error')) return redirectBack('failed', 'oauth_denied');
      if (!/^[a-zA-Z0-9_-]{32,128}$/.test(state) || !code || code.length > 4096)
        return redirectBack('failed', 'invalid_callback');
      const saved = await env.KROGER_KV.get('oauth:' + state, 'json');
      if (!saved || saved.expires < Date.now() || !saved.uid || saved.redirectUri !== redirectUri(request))
        return redirectBack('expired', 'state_expired');
      await env.KROGER_KV.delete('oauth:' + state);
      let result;
      try {
        result = await krogerToken(env, {grant_type: 'authorization_code', code, redirect_uri: saved.redirectUri});
      } catch (error) {
        return redirectBack('failed', error.oauthReason || 'token_network');
      }
      try {
        await env.KROGER_KV.put('token:' + saved.uid, await encrypt(env, {
          access_token: result.access_token, refresh_token: result.refresh_token || null,
          scope: result.scope || '',
          expires: Date.now() + Math.max(0, (Number(result.expires_in) || 0) - 60) * 1000,
          connectedAt: Date.now()
        }));
      } catch {
        return redirectBack('failed', 'storage_failed');
      }
      return redirectBack('connected');
    }
    if (!['/connect', '/status', '/disconnect', '/products', '/cart/add'].includes(path))
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
    if(path==='/products'&&request.method==='GET'){
      const term=(url.searchParams.get('term')||'').trim();
      if(term.length<2||term.length>90)return json({error:'Invalid search'},400,cors);
      try{
        const clientToken=await krogerToken(env,{grant_type:'client_credentials',scope:'product.compact'});
        const q=new URLSearchParams({'filter.term':term,'filter.limit':'10'});
        const response=await fetch(KROGER_BASE+'/v1/products?'+q,{headers:{Authorization:'Bearer '+clientToken.access_token,Accept:'application/json'}});
        if(!response.ok)return json({error:'Product search unavailable'},502,cors);
        const data=await response.json();
        return json({products:(data.data||[]).slice(0,10).map(p=>({name:p.description||'',upc:p.upc||'',brand:p.brand||''})).filter(p=>/^\\d{8,14}$/.test(p.upc))},200,cors);
      }catch{return json({error:'Product search unavailable'},502,cors)}
    }
    if(path==='/cart/add'&&request.method==='POST'){
      let data;
      try{data=await request.json()}catch{return json({error:'Invalid request'},400,cors)}
      const items=data?.items;
      if(!Array.isArray(items)||!items.length||items.length>20||items.some(x=>!x||!/^\\d{8,14}$/.test(x.upc)||!Number.isInteger(x.quantity)||x.quantity<1||x.quantity>30))
        return json({error:'Choose products and quantities first'},400,cors);
      try{
        const access=await userAccessToken(env,uid);
        if(!access)return json({error:'Connect Kroger first'},409,cors);
        const response=await fetch(KROGER_BASE+'/v1/cart/add',{method:'PUT',headers:{Authorization:'Bearer '+access,'Content-Type':'application/json'},body:JSON.stringify({items:items.map(x=>({upc:x.upc,quantity:x.quantity,modality:'PICKUP'}))})});
        if(!response.ok)return json({error:'Kroger cart request failed'},502,cors);
        return json({added:true,count:items.length,message:'Review your cart on Kroger before checkout.'},200,cors);
      }catch{return json({error:'Kroger connection expired or unavailable'},409,cors)}
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