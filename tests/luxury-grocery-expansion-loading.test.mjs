import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const live=readFileSync(new URL('../luxury-v2/live.js',import.meta.url),'utf8');
const grocery=live.slice(live.indexOf('const renderGroceryPanel='),live.indexOf('let groceryOpenWeek='));
const reset=live.slice(live.indexOf('const resetPrivateView='),live.indexOf('onAuthStateChanged(auth'));
const auth=live.slice(live.indexOf('onAuthStateChanged(auth'));

test('native accordion clicks persist intended state before queued toggle',()=>{
 assert.match(grocery,/title\.addEventListener\('click',\(\)=>\{/);
 assert.match(grocery,/\[category\]=!panel\.open;saveGroceryExpansion\(\)/);
 assert.match(grocery,/panel\.open=groceryExpansion\.categories\[week\]\?\.\[category\]\?\?false/);
});
test('delayed native toggle events cannot rewrite state after panel removed',()=>{
 assert.match(grocery,/panel\.addEventListener\('toggle',\(\)=>\{if\(!panel\.isConnected\|\|!host\.contains\(panel\)\|\|groceryExpansion\.week!==week\)return/);
});
test('signed-in account restoration has loading copy, not a false empty-plan message',()=>{
 assert.match(reset,/const resetPrivateView=\(loadingUser=false\)/);
 assert.match(reset,/loadingUser\?'Loading your dinner…':'No dinner selected'/);
 assert.match(auth,/const epoch=\+\+authEpoch;resetPrivateView\(!!user\)/);
 assert.match(reset,/loadingUser\?'Restoring your saved meal plan securely\.'/);
});
