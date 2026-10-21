#!/usr/bin/env node
// Audits every ingredient/unit pair across the 110 recipe drafts.
// Exact mass units are proposals only; food identity and nutrition still require review.
import fs from 'node:fs';
const base='ops/recipe-expansion/';
const recipes=JSON.parse(fs.readFileSync(base+'batch-01-recipe-drafts.json','utf8')).recipes;
const sources=JSON.parse(fs.readFileSync(base+'ingredient-nutrition-sources.json','utf8')).ingredients;
const exact={oz:28.349523125,lb:453.59237,g:1,kg:1000};
const pairs=new Map();
for(const recipe of recipes)for(const [ingredient,quantity,unit] of recipe.ingredients){
 if(!sources[ingredient])throw Error('Missing ingredient source entry: '+ingredient);
 if(!Number.isFinite(quantity)||quantity<=0)throw Error('Invalid recipe quantity: '+ingredient+' / '+recipe.name);
 const key=JSON.stringify([ingredient,unit]);
 if(!pairs.has(key))pairs.set(key,{ingredient,unit,uses:0,recipeNames:[]});
 const pair=pairs.get(key);
 pair.uses++;
 pair.recipeNames.push(recipe.name);
}
const conversions=[...pairs.values()].map(entry=>{
 const grams=exact[entry.unit]??null;
 const existing=sources[entry.ingredient].gramsPerUnit?.[entry.unit]??null;
 return {...entry,proposedGramsPerUnit:grams,
    conversionBasis:grams!==null?'International avoirdupois mass unit':'Ingredient and measurement-specific edible weight required',
    existingApprovedGramsPerUnit:Number.isFinite(existing)&&existing>0?existing:null,
    reviewStatus:'not-approved'};
});
const summary={recipes:recipes.length,distinctIngredients:Object.keys(sources).length,ingredientUnitPairs:conversions.length,
 exactMassUnitPairs:conversions.filter(x=>x.proposedGramsPerUnit!==null).length,
 unresolvedIngredientSpecificPairs:conversions.filter(x=>x.proposedGramsPerUnit===null&&x.existingApprovedGramsPerUnit===null).length,
 approvedNutritionMappings:Object.values(sources).filter(x=>x.reviewStatus==='approved').length,
 warning:'Exact mass conversions do not establish USDA food identity or nutrient content. Never publish unverified recipe nutrition.',
 conversions};
fs.writeFileSync(base+'all-ingredient-measurement-audit.json',JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({recipes:summary.recipes,ingredientUnitPairs:summary.ingredientUnitPairs,exactMassUnitPairs:summary.exactMassUnitPairs,unresolvedIngredientSpecificPairs:summary.unresolvedIngredientSpecificPairs,approvedNutritionMappings:summary.approvedNutritionMappings}));
if(summary.recipes!==110||summary.ingredientUnitPairs!==308)process.exitCode=1;
