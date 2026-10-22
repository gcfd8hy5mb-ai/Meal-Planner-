import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const html=fs.readFileSync(new URL('../luxury-v2/index.html',import.meta.url),'utf8');
const js=fs.readFileSync(new URL('../luxury-v2/live.js',import.meta.url),'utf8');
test('approved meal-picker hierarchy and accessible dismiss control',()=>{
 assert.match(html,/<h2>Choose Dinner<\/h2>/);
 assert.match(html,/id="luxuryPickerClose" aria-label="Close meal picker"/);
 assert.match(html,/picker-results-heading/);
 assert.match(html,/grid-template-columns:repeat\(10,minmax\(0,1fr\)\)/);
 assert.match(js,/\['All','Mexican','Chicken','Beef','Pork'/);
 assert.match(js,/querySelector\('#luxuryPickerClose'\)\.onclick/);
});
