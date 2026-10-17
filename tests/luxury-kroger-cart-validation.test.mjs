import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('Kroger cart rejects malformed product identifiers and package quantities before request',()=>{
 const s=readFileSync(new URL('../luxury-v2/live.js',import.meta.url),'utf8');
 const section=s.slice(s.indexOf("document.querySelector('#krogerAddCartButton').onclick"),s.indexOf('const krogerMatchButton='));
 assert.match(section,/Number\.isSafeInteger\(item\.quantity\)/);
 assert.match(section,/item\.quantity<1/);
 assert.match(section,/item\.quantity>30/);
 assert.match(section,/invalid code or package quantity/);
 assert.ok(section.indexOf('invalid code or package quantity')<section.indexOf("krogerRequest(user,'/cart/add'"));
});
