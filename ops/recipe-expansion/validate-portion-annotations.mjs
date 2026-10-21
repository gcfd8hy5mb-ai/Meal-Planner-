#!/usr/bin/env node
import fs from 'node:fs';
const recipes=JSON.parse(fs.readFileSync('ops/recipe-expansion/batch-01-recipe-drafts.json','utf8')).recipes;
const expected={'Yellow onion':36,'Ground cumin':39,'Lime':23};
const counts=Object.fromEntries(Object.keys(expected).map(x=>[x,0]));
for(const r of recipes){
 for(const [name,expectedCount] of Object.entries(expected)){
  const ingredient=r.ingredients.find(i=>i[0]===name);
  const metadata=r.nutritionIngredientUsage?.[name];
  if(!ingredient){if(metadata)throw Error('Orphan nutrition metadata: '+name+' / '+r.name);continue}
  if(!metadata)throw Error('Missing portion review: '+name+' / '+r.name);
  if(metadata.listedQuantity!==ingredient[1]||metadata.listedUnit!==ingredient[2])
    throw Error('Ingredient/portion review mismatch: '+name+' / '+r.name);
  if(name==='Yellow onion'&& (metadata.edibleWeightGrams!==null||metadata.reviewStatus!=='requires-onion-size-or-edible-weight'))
    throw Error('Unsourced onion weight: '+r.name);
  if(name==='Ground cumin'&& (metadata.sourceWeightGramsPerTsp!==null||metadata.ingredientState!=='ground'))
    throw Error('Unsourced ground cumin mass: '+r.name);
  if(name==='Ground cumin'){
    const candidate=metadata.candidateSource;
    if(metadata.candidateGramsPerGroundTeaspoon!==2||candidate?.type!=='branded-ground-cumin-density'||candidate?.productUpc!=='855269003404'||candidate?.reviewStatus!=='source-and-recipe-review-required')
      throw Error('Ground cumin proposal source metadata missing: '+r.name);
    if(metadata.reviewStatus!=='ground-cumin-source-proposal-needs-review')throw Error('Ground cumin prematurely approved: '+r.name);
  }
  if(name==='Lime'&&metadata.consumedAmountGrams!==null)throw Error('Unsourced lime mass: '+r.name);
  counts[name]++;
 }
}
if(recipes.length!==110||Object.entries(expected).some(([k,v])=>counts[k]!==v))
 throw Error('Incomplete annotation coverage: '+JSON.stringify(counts));
console.log(JSON.stringify({recipes:recipes.length,validatedMetadata:counts,total:Object.values(counts).reduce((a,b)=>a+b,0),approvedNutrition:0}));
