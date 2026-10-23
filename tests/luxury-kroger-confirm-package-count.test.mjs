import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('cart confirmation displays product and package counts',()=>{
 const source=readFileSync(new URL('../luxury-v2/live.js',import.meta.url),'utf8');
 assert.match(source,/const totalPackages=items\.reduce/);
 assert.match(source,/distinct products \('/);
 assert.match(source,/total packages\) to your Kroger cart/);
 assert.match(source,/This will not place an order/);
});
