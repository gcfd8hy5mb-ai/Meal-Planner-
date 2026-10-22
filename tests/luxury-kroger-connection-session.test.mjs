import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../luxury-v2/live.js',import.meta.url),'utf8');
const section=source.slice(source.indexOf('krogerConnectButton.onclick='),source.indexOf('const optionalToggle='));
test('connection callbacks reject previous session responses for same account',()=>{
 assert.equal((section.match(/const user=auth\.currentUser,epoch=krogerEpoch/g)||[]).length,2);
 assert.equal((section.match(/if\(epoch!==krogerEpoch\|\|auth\.currentUser\?\.uid!==user\.uid\)return/g)||[]).length,2);
 assert.equal((section.match(/if\(epoch===krogerEpoch&&auth\.currentUser\?\.uid===user\.uid\)/g)||[]).length,2);
});
