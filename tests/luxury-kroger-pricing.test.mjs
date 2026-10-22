import test from 'node:test';import assert from 'node:assert/strict';
import {krogerPriceSummary,sortKrogerOffers} from '../luxury-v2/kroger-pricing.mjs';
test('highlights actual savings only when promo is lower than regular',()=>{
 const a=krogerPriceSummary({regular:5.99,promo:4.49});
 assert.equal(a.onSale,true);assert.match(a.label,/save \$1\.50/);
 assert.equal(krogerPriceSummary({regular:4,promo:5}).onSale,false);
 assert.equal(krogerPriceSummary({regular:null,promo:3}).onSale,false);
});
test('shows absent and malformed prices safely',()=>{
 assert.equal(krogerPriceSummary({}).label,'Price unavailable');
 assert.equal(krogerPriceSummary({regular:'5.00',promo:'3.00'}).onSale,false);
});
test('prioritizes eligible promotional offers without losing alternatives',()=>{
 const products=[{name:'A',regular:3},{name:'B',regular:6,promo:4},{name:'C',regular:9,promo:8}];
 const ordered=sortKrogerOffers(products);
 assert.deepEqual(ordered.map(x=>x.name),['B','C','A']);
 assert.equal(products[0].name,'A');
});
