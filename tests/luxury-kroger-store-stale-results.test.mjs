import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const js=readFileSync(new URL('../luxury-v2/live.js',import.meta.url),'utf8');
test('switching store invalidates outstanding manual product searches and selections',()=>{
 const block=js.slice(js.indexOf('krogerStoreSelect.onchange='),js.indexOf('const productPanel='));
 assert.match(block,/\+\+productSearchEpoch/);
 assert.match(block,/selectedKroger\.clear\(\)/);
});
test('old store results are rejected in both search modes',()=>{
 assert.match(js,/searchStore=krogerLocationId/);
 assert.match(js,/krogerLocationId!==searchStore/);
 assert.match(js,/matchStore=krogerLocationId/);
 assert.match(js,/krogerLocationId!==matchStore/);
});
