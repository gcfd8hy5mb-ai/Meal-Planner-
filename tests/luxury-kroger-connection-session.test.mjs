import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../luxury-v2/live.js',import.meta.url),'utf8');
const section=source.slice(source.indexOf('krogerConnectButton.onclick='),source.indexOf('const optionalToggle='));
test('Kroger connect and disconnect reject stale account/session responses',()=>{
 assert.ok(section.startsWith('krogerConnectButton.onclick='));
 assert.match(section,/krogerDisconnectButton.onclick=/);
 assert.equal((section.match(/const user=auth\.currentUser;if\(!user\|\|krogerActionPending\)return/g)||[]).length,2);
 assert.equal((section.match(/const epoch=\+\+krogerEpoch/g)||[]).length,2);
 assert.equal((section.match(/const actionEpoch=\+\+krogerActionEpoch;krogerActionPending=true/g)||[]).length,2);
 assert.ok((section.match(/if\(epoch!==krogerEpoch\|\|auth\.currentUser\?\.uid!==user\.uid\)return/g)||[]).length>=2);
 assert.ok((section.match(/if\(actionEpoch===krogerActionEpoch\)krogerActionPending=false/g)||[]).length>=2);
});
