import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),'utf8'));
const drafts=read('../ops/recipe-expansion/batch-01-recipe-drafts.json').recipes;
const manifest=read('../ops/recipe-expansion/batch-01-photo-manifest.json');
test('every drafted recipe has a matching photo work item',()=>{
 const byId=new Map(manifest.recipes.map(r=>[r.id,r]));
 assert.equal(byId.size,manifest.recipes.length);
 for(const recipe of drafts){
  const image=byId.get(recipe.id);
  assert.ok(image,recipe.name+' has no paired image');
  assert.equal(image.name,recipe.name);
  assert.equal(image.expectedAsset,'assets/meal-photos/'+recipe.id+'.webp');
  assert.equal(image.pairedWithInstructions,true);
 }
});
test('photo-ready state requires a real individual saved and reviewed file',()=>{
 for(const recipe of drafts){
  const image=manifest.recipes.find(x=>x.id===recipe.id);
  if(recipe.photoReady||image.assetSaved||image.photoReview==='approved'){
   assert.equal(recipe.photoReady,true);
   assert.equal(image.assetSaved,true);
   assert.equal(image.photoReview,'approved');
   assert.equal(recipe.photo,image.expectedAsset);
   assert.ok(existsSync(new URL('../'+image.expectedAsset,import.meta.url)),recipe.name+' photo missing from repository');
  }
 }
});
