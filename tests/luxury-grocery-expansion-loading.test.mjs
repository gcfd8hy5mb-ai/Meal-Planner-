import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const live=readFileSync(new URL('../luxury-v2/live.js',import.meta.url),'utf8');
const grocery=live.slice(live.indexOf('const renderGroceryPanel='),live.indexOf('let groceryOpenWeek='));
const reset=live.slice(live.indexOf('const resetPrivateView='),live.indexOf('onAuthStateChanged(auth'));
const auth=live.slice(live.indexOf('onAuthStateChanged(auth'));

test('accordion explicitly controls browser details state before saving',()=>{
 assert.match(grocery,/title\.addEventListener\('click',event=>\{/);
 assert.match(grocery,/event\.preventDefault\(\)/);
 assert.match(grocery,/const next=!panel\.open;/);
 assert.match(grocery,/panel\.open=next;/);
 assert.match(grocery,/\[category\]=next;/);
 assert.match(grocery,/saveGroceryExpansion\(\)/);
 assert.doesNotMatch(grocery,/panel\.addEventListener\('toggle'/);
});
test('detached accordion events cannot update a different view',()=>{
 assert.match(grocery,/!panel\.isConnected\|\|!host\.contains\(panel\)\|\|groceryExpansion\.week!==week/);
});
test('signed-in loading follows synchronous private reset without false empty state',()=>{
 assert.match(reset,/const resetPrivateView=\(\)=>/);
 assert.match(auth,/const epoch=\+\+authEpoch;resetPrivateView\(\);if\(user\)/);
 assert.match(auth,/textContent='Loading your dinner…'/);
 assert.match(auth,/textContent='Restoring your saved meal plan securely\.'/);
 assert.ok(auth.indexOf("resetPrivateView()")<auth.indexOf("textContent='Loading your dinner…'"));
});

test('first HTML paint shows loading, not a false empty-plan message',()=>{const html=readFileSync(new URL('../luxury-v2/index.html',import.meta.url),'utf8');assert.match(html,/<h2>Loading your dinner…<\/h2>/);assert.doesNotMatch(html,/<h2>No dinner selected<\/h2>/);});
