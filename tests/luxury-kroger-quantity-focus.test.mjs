import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('Kroger package editing keeps the active input mounted',()=>{
 const src=readFileSync(new URL('../luxury-v2/live.js',import.meta.url),'utf8');
 const start=src.indexOf('quantity.onchange=()=>');
 const end=src.indexOf('row.append(label,quantity)',start);
 const handler=src.slice(start,end);
 assert.match(handler,/item\.quantity=value/);
 assert.match(handler,/count\.textContent=/);
 assert.doesNotMatch(handler,/renderKrogerSelection\(\)/);
 assert.match(handler,/Number\.isSafeInteger\(value\)/);
});
