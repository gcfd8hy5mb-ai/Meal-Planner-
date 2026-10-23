import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const live=fs.readFileSync(new URL('../luxury-v2/live.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../luxury-v2/index.html',import.meta.url),'utf8');
test('Cook ingredients button is explicitly selected, not a generic full-width button',()=>{
 assert.match(html,/section data-page="cook"[\s\S]*?View ingredients checklist/);
 assert.match(live,/querySelector\('section\[data-page="cook"\] > button\.primary\.full'\)\.onclick/);
 assert.doesNotMatch(live,/querySelector\('\.full'\)\.onclick/);
});
