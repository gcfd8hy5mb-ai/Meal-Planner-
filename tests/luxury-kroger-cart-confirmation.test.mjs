import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('Kroger final confirmation shows distinct products and package totals',()=>{
 const source=readFileSync(new URL('../luxury-v2/live.js',import.meta.url),'utf8');
 assert.ok(source.includes('const packageTotal=items.reduce((sum,item)=>sum+item.quantity,0)'));
 assert.ok(source.includes("distinct products ('+packageTotal+' total packages)"));
 assert.ok(source.includes('This will not place an order.'));
});
