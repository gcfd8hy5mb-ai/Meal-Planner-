import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../luxury-v2/live.js',import.meta.url),'utf8');
test('unconfirmed Kroger cart update warns users before retry',()=>{
 const start=source.indexOf("document.querySelector('#krogerAddCartButton').onclick");
 const end=source.indexOf('const krogerMatchButton=',start);
 const section=source.slice(start,end);
 assert.match(section,/Kroger cart update was not confirmed/);
 assert.match(section,/Check your Kroger cart before retrying/);
 assert.match(section,/avoid adding products twice/);
 assert.match(section,/for\(const item of items\)/);
});
