import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const js=readFileSync(new URL('../luxury-v2/live.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../luxury-v2/index.html',import.meta.url),'utf8');
test('Kroger cart review has quantity editor tied to every selected product',()=>{
 assert.match(html,/id="krogerQuantityList"/);
 assert.match(js,/list\.replaceChildren\(\)/);
 assert.match(js,/quantity\.type='number'/);
 assert.match(js,/quantity\.min='1';quantity\.max='30';quantity\.step='1'/);
 assert.match(js,/quantity\.onchange=/);
 assert.match(js,/item\.quantity=value;renderKrogerSelection\(\)/);
});
test('invalid edits revert and cart sends only reviewed UPC and quantities',()=>{
 assert.match(js,/if\(!Number\.isSafeInteger\(value\)\|\|value<1\|\|value>30\)/);
 assert.match(js,/quantity\.value=String\(item\.quantity\)/);
 assert.match(js,/map\(\(\{upc,quantity\}\)=>\(\{upc,quantity\}\)\)/);
 assert.match(js,/name:item\.name,quantity:1/);
 assert.match(js,/name:product\.name,quantity:suggested\?\?1/);
});
