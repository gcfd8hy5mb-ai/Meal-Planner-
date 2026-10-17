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
