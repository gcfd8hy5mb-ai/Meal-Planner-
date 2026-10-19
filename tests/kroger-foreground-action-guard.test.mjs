import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const js=readFileSync(new URL('../luxury-v2/live.js',import.meta.url),'utf8');
const resume=js.slice(js.indexOf('const refreshKrogerOnReturn='),js.indexOf('krogerConnectButton.onclick='));
const connect=js.slice(js.indexOf('krogerConnectButton.onclick='),js.indexOf('krogerDisconnectButton.onclick='));
const disconnect=js.slice(js.indexOf('krogerDisconnectButton.onclick='),js.indexOf('const optionalToggle='));
const reset=js.slice(js.indexOf('const resetPrivateView='),js.indexOf('onAuthStateChanged(auth'));
test('iPhone foreground refresh does not interrupt connection actions',()=>{
 assert.match(resume,/\|\|krogerActionPending\)return/);
 assert.match(resume,/void refreshKroger\(\)/);
});
test('both connection actions block duplicate actions and reliably unlock',()=>{
 for(const section of [connect,disconnect]){
  assert.match(section,/if\(!user\|\|krogerActionPending\)return/);
  assert.match(section,/const actionEpoch=\+\+krogerActionEpoch;krogerActionPending=true/);
  assert.match(section,/finally\{if\(actionEpoch===krogerActionEpoch\)krogerActionPending=false;\}/);
 }
});
test('account reset prevents old action cleanup from changing new account state',()=>{
 assert.match(reset,/\+\+krogerActionEpoch;krogerActionPending=false/);
});
