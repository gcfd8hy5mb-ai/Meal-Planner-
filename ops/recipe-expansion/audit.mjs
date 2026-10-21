// CI gate for expanding Tablewise without silent catalog or photography regressions.
import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {recipes,verifiedRecipePhotos} from '../../luxury-v2/catalog.js';
const root=resolve(import.meta.dirname,'../..');
const plan=JSON.parse(readFileSync(resolve(root,'ops/recipe-expansion/plan.json'),'utf8'));
const errors=[];
const fail=message=>errors.push(message);
if(plan.baseline!==166||plan.target!==1000)fail('Unexpected recipe baseline or target');
let cumulative=plan.baseline;
for(const [i,b] of plan.batches.entries()){
 cumulative+=b.add;
 if(b.number!==i+1||b.cumulative!==cumulative)fail('Incorrect batch '+(i+1)+' count');
}
if(cumulative!==plan.target)fail('Batch additions do not total 1000');
const existingNames=new Set(), existingIds=new Set();
for(const recipe of recipes){
 const id=String(recipe.id||'').trim(),name=String(recipe.name||'').trim().toLowerCase();
 if(!id||existingIds.has(id))fail('Missing/duplicate current ID: '+id);
 if(!name||existingNames.has(name))fail('Missing/duplicate current recipe name: '+name);
 existingIds.add(id);existingNames.add(name);
}
if(recipes.length!==plan.baseline)fail('Current catalog count changed unexpectedly ('+recipes.length+')');
let completeBatches=0;
for(const b of plan.batches){
 const file=resolve(root,'ops/recipe-expansion/batch-'+String(b.number).padStart(2,'0')+'.json');
 if(!existsSync(file))continue;
 const rows=JSON.parse(readFileSync(file,'utf8'));
 if(!Array.isArray(rows)) {fail(file+' is not a recipe array');continue}
 if(rows.length>b.add)fail('Batch '+b.number+' exceeds its allowed '+b.add+' slots');
 let fullyReviewed=rows.length===b.add;
 for(const recipe of rows){
  const id=String(recipe.id||'').trim(),name=String(recipe.name||'').trim(),low=name.toLowerCase();
  if(!id||existingIds.has(id))fail('Missing/duplicate ID in batch '+b.number+': '+id);
  if(!low||existingNames.has(low))fail('Missing/duplicate recipe name in batch '+b.number+': '+name);
  existingIds.add(id);existingNames.add(low);
  if(!['Breakfast','Lunch','Dinner','Snack'].includes(recipe.slot))fail('Invalid meal slot: '+name);
  const prohibited=plan.recipePreferences?.excludeNewRecipesContaining||[];
  const foodText=[recipe.name,...(Array.isArray(recipe.ingredients)?recipe.ingredients.map(x=>x?.[0]):[])].join(' ').toLowerCase();
  if(prohibited.some(item=>foodText.split(/[^a-z0-9-]+/).includes(item)||foodText.includes(item)))fail('Excluded tofu or meat-substitute ingredient in new recipe: '+name);
  if(!Array.isArray(recipe.ingredients)||recipe.ingredients.length<3||recipe.ingredients.some(x=>!Array.isArray(x)||x.length<3||!x[0]||!(Number(x[1])>0)||!x[2]))fail('Unmeasured ingredients: '+name);
  if(!Array.isArray(recipe.steps)||recipe.steps.length<4||recipe.steps.some(x=>typeof x!=='string'||x.trim().length<25))fail('Incomplete cooking instructions: '+name);
  if(!recipe.photo||typeof recipe.photo!=='string'||!recipe.photo.startsWith('assets/meal-photos/')||!existsSync(resolve(root,recipe.photo)))fail('Missing local recipe-specific photo: '+name);
  if(recipe.source&&!recipe.source.license)fail('Imported recipe is missing usage/license documentation: '+name);
  if(recipe.photoReview!=='approved')fail('Unreviewed photo-to-recipe match: '+name);
 }
 if(fullyReviewed)completeBatches++;
}
if(errors.length){for(const e of errors)console.error('FAIL:',e);process.exitCode=1}
else console.log(JSON.stringify({status:'PASS',existing:recipes.length,target:plan.target,added:0,completedBatches:completeBatches,planned:plan.batches.map(b=>b.add),photoMappedNow:Object.keys(verifiedRecipePhotos).length,note:'Staged batches are not activated or counted until approved and published'}));
