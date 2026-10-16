import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../luxury-v2/catalog.js',import.meta.url),'utf8');
const scope={};
vm.runInNewContext(source.replace(/export\s*\{recipes,verifiedRecipePhotos\};?/,'')+'\n;globalThis.__recipes=recipes;',scope,{timeout:2000});
const recipes=Array.from(scope.__recipes);
test('all 166 grocery ingredient quantities are numeric, positive, and unit-defined',()=>{
 assert.equal(recipes.length,166);
 for(const recipe of recipes){
  assert.ok(Array.isArray(recipe.ingredients)&&recipe.ingredients.length>=2,recipe.id);
  const seen=new Set();
  for(const item of recipe.ingredients){
   assert.equal(item.length,3,recipe.id);
   const [name,quantity,unit]=item;
   assert.ok(typeof name==='string'&&name.trim(),recipe.id+' has an unnamed grocery item');
   assert.ok(typeof quantity==='number'&&Number.isFinite(quantity)&&quantity>0,recipe.id+': '+name+' has invalid quantity');
   assert.ok(typeof unit==='string'&&unit.trim(),recipe.id+': '+name+' is missing units');
   const normalized=name.toLowerCase().trim();
   assert.ok(!seen.has(normalized),recipe.id+' lists duplicate ingredient '+name);
   seen.add(normalized);
  }
 }
});
test('recipes do not call for measured cooking oil without listing cooking oil',()=>{
 for(const recipe of recipes){
  const directions=recipe.steps.join(' ');
  const measuredOil=/(?:\\d+|½|¼|¾|⅓|⅔)\\s*(?:tsp|tbsp|teaspoons?|tablespoons?)\\s+(?:of\\s+)?(?:(?:olive|cooking|vegetable|sesame)\\s+)?oil\\b/i.test(directions);
  if(measuredOil)assert.ok(recipe.ingredients.some(([name])=>/\\boil\\b/i.test(name)),recipe.id+' mentions measured oil without grocery entry');
 }
});
