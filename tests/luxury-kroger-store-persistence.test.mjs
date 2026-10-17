import test from 'node:test';import assert from 'node:assert/strict';
import {readKrogerStore,saveKrogerStore} from '../luxury-v2/kroger-store.mjs';
import {krogerPriceSummary} from '../luxury-v2/kroger-pricing.mjs';
const storage=()=>{const db=new Map();return {getItem:k=>db.get(k)??null,setItem:(k,v)=>db.set(k,v)}};
test('saved store survives page reload and is isolated per user',()=>{
 const s=storage();
 assert.equal(saveKrogerStore(s,'personA',{id:'12345678',label:'Kroger Downtown',zip:'75460'}),true);
 assert.equal(readKrogerStore(s,'personA').id,'12345678');
 assert.equal(readKrogerStore(s,'personB'),null);
 assert.equal(saveKrogerStore(s,'personB',{id:'invalid',label:'Other'}),false);
});
test('invalid corrupted data does not restore',()=>{
 const s=storage();s.setItem('tablewise:kroger-store:v1:A','{bad');
 assert.equal(readKrogerStore(s,'A'),null);
});
test('zero, equal, and missing Kroger promos never appear as sale',()=>{
 assert.equal(krogerPriceSummary({regular:5.99,promo:0}).onSale,false);
 assert.equal(krogerPriceSummary({regular:5.99,promo:5.99}).onSale,false);
 assert.equal(krogerPriceSummary({regular:5.99,promo:null}).onSale,false);
 assert.equal(krogerPriceSummary({regular:5.99,promo:4.99}).onSale,true);
});
