import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {krogerRequest,KROGER_WORKER} from '../luxury-v2/kroger-connect.mjs';
const page=fs.readFileSync(new URL('../luxury-v2/index.html',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../luxury-v2/live.js',import.meta.url),'utf8');
test('Kroger UI and safe connection operations exist without public credentials',()=>{
 for(const id of ['krogerConnectPanel','krogerConnectButton','krogerDisconnectButton','krogerConnectionStatus'])assert.ok(page.includes('id="'+id+'"'));
 assert.ok(app.includes("krogerRequest(user,'/connect'"));
 assert.ok(app.includes("krogerRequest(user,'/status'"));
 assert.ok(app.includes("krogerRequest(user,'/disconnect'"));
 assert.match(KROGER_WORKER,/^https:\/\//);
 assert.doesNotMatch(page+app,/KROGER_CLIENT_SECRET|KROGER_TOKEN_ENCRYPTION_KEY/);
});
test('Reject unauthenticated or unauthorized Kroger actions',async()=>{
 await assert.rejects(krogerRequest(null,'/status'),/sign-in required/i);
 await assert.rejects(krogerRequest({getIdToken:async()=> 'fake'},'/other-action',{method:'POST'}),/Unsupported Kroger action/);
});

test('product review requires explicit user confirmation and never initiates checkout',()=>{
 assert.match(app,/krogerRequest\(user,'\/products'/);
 assert.match(app,/window\.confirm\('Add '/);
 assert.match(app,/krogerRequest\(user,'\/cart\/add'/);
 assert.doesNotMatch(app,/\/checkout|placeOrder|purchaseNow/i);
});

test('Network/CORS and HTTP errors are separated without leaking gateway response',async()=>{
 const original=globalThis.fetch;
 const user={getIdToken:async()=> 'disposable-token'};
 try{
  globalThis.fetch=async()=>{throw new TypeError('Failed to fetch')};
  await assert.rejects(krogerRequest(user,'/status'),/gateway is unreachable.*allowed-origins\/CORS/i);
  globalThis.fetch=async()=>({ok:false,status:403,json:async()=>({error:'sensitive backend detail'})});
  await assert.rejects(krogerRequest(user,'/status'),e=>e.message.includes('HTTP 403')&&!e.message.includes('sensitive backend detail'));
  globalThis.fetch=async()=>({ok:false,status:502,json:async()=>({error:'private worker detail'})});
  await assert.rejects(krogerRequest(user,'/status'),e=>e.message.includes('HTTP 502')&&!e.message.includes('private worker detail'));
 }finally{globalThis.fetch=original}
});
test('Preview displays a classified status error without changing connection state',()=>{
 assert.match(app,/Kroger connection check failed:/);
 assert.match(app,/Your last confirmed connection state is preserved/);
 assert.match(app,/krogerStatus\.textContent\.startsWith\('Kroger connection check failed:'\)/);
});
