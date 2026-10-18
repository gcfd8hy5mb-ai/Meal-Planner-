import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../luxury-v2/live.js',import.meta.url),'utf8');
test('product-search buttons cannot mutate selection during Kroger submission',()=>{
 assert.match(source,/button\.onclick=\(\)=>\{if\(krogerCartPending\)return;if\(selectedKroger\.has\(item\.upc\)\)/);
});
test('ingredient-match buttons cannot mutate selection during Kroger submission',()=>{
 assert.match(source,/select\.onclick=\(\)=>\{if\(krogerCartPending\)return;if\(selectedKroger\.has\(product\.upc\)\)/);
});
