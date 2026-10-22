import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../luxury-v2/live.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../luxury-v2/index.html',import.meta.url),'utf8');
test('grocery matching controls and guarded batches',()=>{
 for(const id of ['krogerMatchList','krogerMatchProgress','krogerMatchResults','krogerMatchMore'])assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(source,/matchPosition\+5/);
 assert.match(source,/groceryTotals\(effectiveAccount\(\),findRecipe,groceryWeek/);
 assert.match(source,/krogerRequest\(user,'\/products'/);
});
test('results require manual product selection and explicit cart confirmation',()=>{
 assert.match(source,/selectedKroger\.set\(product\.upc/);
 assert.match(source,/window\.confirm\('Add '/);
 assert.match(source,/krogerRequest\(user,'\/cart\/add'/);
 assert.doesNotMatch(source,/\/checkout|placeOrder/);
});
