import assert from 'node:assert/strict';
import {recipes} from '../luxury-v2/catalog.js';
import {searchMeals} from '../luxury-v2/meal-search.mjs';
for(const slot of ['Breakfast','Lunch']){
 const fresh=recipes.filter(r=>r.id.startsWith('quick-'+slot.toLowerCase()+'-'));
 assert.equal(fresh.length,20,slot+' count');
 assert.equal(new Set(fresh.map(r=>r.id)).size,20);
 for(const r of fresh){
  assert.equal(r.slot,slot);
  assert.ok(r.prepMinutes+r.cookMinutes<=20,r.name+' takes more than 20 minutes');
  assert.ok(Array.isArray(r.ingredients)&&r.ingredients.length>=2,r.name+' has no usable groceries');
  assert.ok(r.ingredients.every(([name,n,unit])=>name&&n>0&&unit),r.name+' missing measured ingredient');
  assert.ok(r.steps.length>=2&&r.steps.every(x=>x.length>35),r.name+' has incomplete instructions');
  assert.ok([r.cal,r.p,r.c,r.f].every(v=>Number.isFinite(v)),r.name+' missing nutrition');
  assert.ok(searchMeals(recipes,{slot,query:r.name}).some(x=>x.id===r.id),r.name+' not discoverable');
 }
}
assert.equal(new Set(recipes.map(r=>r.id)).size,recipes.length,'Duplicate recipe IDs');
console.log('PASS 40 quick recipes, ingredients, instructions, macros, no duplicate IDs and slot search');
