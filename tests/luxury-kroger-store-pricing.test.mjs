import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const script=readFileSync(new URL('../luxury-v2/live.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../luxury-v2/index.html',import.meta.url),'utf8');
const api=readFileSync(new URL('../luxury-v2/kroger-connect.mjs',import.meta.url),'utf8');
test('location UI and signed-in lookup are provided',()=>{
 for(const id of ['krogerStoreZip','krogerFindStores','krogerStoreSelect','krogerStoreMessage'])assert.ok(html.includes('id="'+id+'"'));
 assert.ok(api.includes("'/locations'"));
 assert.match(script,/krogerRequest\(user,'\/locations',\{params:\{zip\}\}\)/);
 assert.match(script,/krogerStoreSelect\.onchange/);
});
test('product and ingredient searches use selected location',()=>{
 assert.match(script,/params:\{term,locationId:krogerLocationId\}/);
 assert.match(script,/params:\{term:item\.name,locationId:krogerLocationId\}/);
 assert.match(script,/if\(!krogerLocationId\)/);
 assert.match(script,/selectedKroger\.clear\(\);renderKrogerSelection\(\)/);
});
