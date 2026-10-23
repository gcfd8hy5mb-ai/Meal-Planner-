import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const s=readFileSync(new URL('../luxury-v2/live.js',import.meta.url),'utf8');
test('quantity and removal controls are disabled during cart submissions',()=>{
 assert.match(s,/quantity\.disabled=krogerCartPending/);
 assert.match(s,/remove\.disabled=krogerCartPending/);
});
test('cart submission locks and unlocks review inputs around network call',()=>{
 const code=s.slice(s.indexOf("document.querySelector('#krogerAddCartButton').onclick"),s.indexOf('const krogerMatchButton='));
 assert.match(code,/krogerCartPending=true;button\.disabled=true;renderKrogerSelection\(\)/);
 assert.match(code,/finally\{krogerCartPending=false;button\.disabled=false;renderKrogerSelection\(\)\}/);
});
