import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../luxury-v2/catalog.js',import.meta.url),'utf8');
const context={};vm.runInNewContext(source.replace(/export\s*\{recipes,verifiedRecipePhotos\};?/,'')+'\n;globalThis.__recipes=recipes;',context,{timeout:2000});
const recipes=Array.from(context.__recipes);
test('all 166 recipes have unique IDs and readable cooking steps',()=>{
 assert.equal(recipes.length,166);
 assert.equal(new Set(recipes.map(r=>r.id)).size,166);
 for(const r of recipes){
  assert.ok(Array.isArray(r.steps)&&r.steps.length>=3,r.id+' has insufficient steps');
  assert.ok(r.steps.every(s=>typeof s==='string'&&s.trim().length>=24),r.id+' has a terse step');
  assert.doesNotMatch(r.steps.join(' '),/not included in the listed ingredients/i,r.id+' has unlisted ingredients');
 }
});
