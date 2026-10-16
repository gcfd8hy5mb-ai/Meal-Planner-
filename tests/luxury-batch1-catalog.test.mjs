import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {reviewedRecipeDetails,recipeSummary} from '../luxury-v2/recipe-details.mjs';
const source=fs.readFileSync(new URL('../luxury-v2/catalog.js',import.meta.url),'utf8');
const js=source.replace(/export\s*\{recipes,verifiedRecipePhotos\};?/, '')+'\n;globalThis.__recipes=recipes;';
const ctx={};vm.runInNewContext(js,ctx,{timeout:2000});
const batch=Array.from(ctx.__recipes).slice(0,42);
test('batch-one maps to exactly the first 42 real recipes',()=>{
 assert.equal(batch.length,42);assert.equal(new Set(batch.map(r=>r.id)).size,42);
 assert.deepEqual(Object.keys(reviewedRecipeDetails).sort(),batch.map(r=>r.id).sort());
});
test('each batch-one recipe has measured ingredients and multi-step cooking directions',()=>{
 for(const r of batch){assert.ok(Array.isArray(r.ingredients)&&r.ingredients.length>=2,r.id+' needs ingredients');
  for(const item of r.ingredients){assert.equal(item.length,3,r.id);assert.ok(Number(item[1])>0,r.id+' has unmeasured ingredient');assert.ok(item[2],r.id+' missing unit');}
  assert.ok(Array.isArray(r.steps)&&r.steps.length>=3,r.id+' needs step-by-step instructions');
  for(const step of r.steps)assert.ok(step.length>=24,r.id+' contains insufficiently detailed step');
  const summary=recipeSummary(r);assert.ok(summary.description.length>20,r.id+' needs description');assert.match(summary.time,/Prep/);
 }
});
