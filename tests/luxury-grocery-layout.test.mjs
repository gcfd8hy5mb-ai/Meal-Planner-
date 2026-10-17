import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../luxury-v2/index.html',import.meta.url),'utf8');
test('groceries appear before collapsible Kroger tools',()=>{
 const grocery=html.indexOf('id="groceryItems"'),drawer=html.indexOf('id="groceryKrogerDrawer"');
 assert.ok(grocery>0&&drawer>grocery);
 assert.match(html,/<details class="grocery-kroger-drawer"/);
 assert.match(html,/<summary>/);
});
test('all Kroger controls and grocery selection remain present',()=>{
 for(const id of ['krogerConnectPanel','krogerProductReview','krogerStoreZip','krogerStoreSelect','krogerMatchList','krogerProductTerm','krogerAddCartButton','groceryCount','clearGroceries'])assert.ok(html.includes('id="'+id+'"'),id);
 assert.ok(html.includes('data-grocery-week="both"'));
 assert.ok(html.includes('data-grocery-week="1"'));
 assert.ok(html.includes('data-grocery-week="2"'));
});
