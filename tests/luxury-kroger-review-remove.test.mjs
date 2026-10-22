import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
test('Kroger selection review lets shoppers remove an item without returning to search',()=>{
 const s=readFileSync(new URL('../luxury-v2/live.js',import.meta.url),'utf8');
 const section=s.slice(s.indexOf('const renderKrogerSelection='),s.indexOf("document.querySelector('#krogerSearchButton')"));
 assert.match(section,/remove\.textContent='Remove'/);
 assert.match(section,/remove\.setAttribute\('aria-label'/);
 assert.match(section,/selectedKroger\.delete\(upc\);renderKrogerSelection\(\)/);
 assert.match(section,/if\(krogerCartPending\)return/);
});
