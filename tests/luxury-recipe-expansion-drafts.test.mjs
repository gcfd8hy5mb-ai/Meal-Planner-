import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {recipes as existing} from '../luxury-v2/catalog.js';
const drafts=JSON.parse(readFileSync(new URL('../ops/recipe-expansion/batch-01-recipe-drafts.json',import.meta.url)));
test('draft IDs and names match selected concepts, not existing recipes',()=>{
 const ids=new Set(existing.map(x=>x.id)), names=new Set(existing.map(x=>x.name.toLowerCase()));
 for(const r of drafts.recipes){
  assert.match(r.id,/^exp01-\d{3}$/,'staged recipe ID format');
  assert.ok(r.name.trim().length>=6,'draft recipe needs a descriptive name');
  assert.ok(!ids.has(r.id),'duplicate ID');assert.ok(!names.has(r.name.toLowerCase()),'duplicate name');
  ids.add(r.id);names.add(r.name.toLowerCase());
 }
 assert.equal(ids.size,existing.length+drafts.recipes.length);
});
test('every staged recipe has substantial quantities and actionable cooking instructions',()=>{
 for(const r of drafts.recipes){
  assert.ok(r.ingredients.length>=4,r.name+' ingredient breadth');
  assert.ok(r.ingredients.every(([name,quantity,unit])=>name&&Number.isFinite(quantity)&&quantity>0&&unit),r.name+' ingredients');
  assert.ok(r.steps.length>=4,r.name+' instructions');
  assert.ok(r.steps.every(step=>step.length>=35),r.name+' step specificity');
  assert.ok(r.serv>=2,r.name+' servings');
  assert.equal(r.ingredientsReady,true);assert.equal(r.instructionsReady,true);
 }
});
test('new recipes exclude tofu and mock meat; cannot accidentally publish without verified photographs',()=>{
 for(const r of drafts.recipes){
  const text=[r.name,...r.ingredients.map(row=>row[0])].join(' ').toLowerCase();
  assert.doesNotMatch(text,/\b(tofu|tempeh|seitan|soy curls)\b/);
  assert.equal(r.photoReady,false);assert.equal(r.photoReview,'pending');
  assert.equal(r.photo,null);assert.equal(r.stage,'recipe-draft');
 }
 assert.equal(drafts.status,'unpublished-photo-review-pending');
});
