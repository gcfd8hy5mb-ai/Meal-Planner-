import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const html=fs.readFileSync(new URL('../luxury-v2/index.html',import.meta.url),'utf8');
test('open meal picker is never obstructed by fixed navigation',()=>{
 assert.match(html,/body:has\(#luxuryMealPicker:not\(\[hidden\]\)\) footer\{display:none\}/);
 assert.match(html,/#luxuryMealPicker\{scroll-margin-top:20px;margin-bottom:/);
});
