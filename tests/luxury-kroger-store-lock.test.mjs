import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../luxury-v2/live.js',import.meta.url),'utf8');
test('Kroger store picker is locked while cart submission is pending',()=>{
 assert.match(source,/if\(krogerCartPending\)\{krogerStoreSelect\.value=krogerLocationId;return\}/);
 assert.match(source,/krogerStoreSelect\.disabled=true/);
 assert.match(source,/krogerStoreSelect\.disabled=false/);
});
test('find-store action is locked during submission and restored after it',()=>{
 assert.match(source,/krogerFindStores'\)\.onclick=async\(\)=>\{\s*if\(krogerCartPending\)return/);
 assert.match(source,/krogerFindStores'\)\.disabled=true/);
 assert.match(source,/krogerFindStores'\)\.disabled=false/);
});
