#!/usr/bin/env node
// Assess real nutrition verification readiness, prioritizing ingredients that unlock the most recipes.
// Does not replace source approvals, infer macro values, or touch production.
import fs from 'node:fs';
const root='ops/recipe-expansion/';
const recipes=JSON.parse(fs.readFileSync(root+'batch-01-recipe-drafts.json','utf8')).recipes;
const sources=JSON.parse(fs.readFileSync(root+'ingredient-nutrition-sources.json','utf8')).ingredients;
const nutrients=['kcalPer100g','proteinPer100g','carbsPer100g','fatPer100g'];
const blockersByRecipe=[], ingredientStats=new Map();
for(const recipe of recipes){
 const blockers=[];
 for(const [name,quantity,unit] of recipe.ingredients){
  const record=sources[name];
  const reason=[];
  if(!record)reason.push('source-record-missing');
  else{
   if(record.reviewStatus!=='approved'||!record.source||!record.foodId)reason.push('food-identity-unapproved');
   if(nutrients.some(n=>!Number.isFinite(record[n])||record[n]<0))reason.push('macros-unverified');
   if(!Number.isFinite(record.gramsPerUnit?.[unit])||record.gramsPerUnit[unit]<=0)reason.push('portion-weight-unverified');
  }
  if(reason.length){
   blockers.push({ingredient:name,unit,reason});
   const key=JSON.stringify([name,unit]);
   if(!ingredientStats.has(key))ingredientStats.set(key,{ingredient:name,unit,uses:0,recipes:[],reasons:reason});
   const entry=ingredientStats.get(key);entry.uses++;entry.recipes.push(recipe.id);
  }
 }
 blockersByRecipe.push({id:recipe.id,name:recipe.name,remainingIngredientPairs:blockers.length,blocked:blockers});
}
const pending=new Set(blockersByRecipe.filter(x=>x.remainingIngredientPairs>0).map(x=>x.id));
const recommended=[];
let candidates=[...ingredientStats.values()];
while(pending.size&&candidates.length){
 candidates.sort((a,b)=>b.recipes.filter(id=>pending.has(id)).length-a.recipes.filter(id=>pending.has(id)).length||b.uses-a.uses||a.ingredient.localeCompare(b.ingredient));
 const best=candidates.shift();
 recommended.push({ingredient:best.ingredient,unit:best.unit,uses:best.uses,recipesAffected:best.recipes.length,reason:best.reasons});
 // A recipe is unlocked only when all of its blocked ingredient-unit pairs have been cleared.
 for(const recipe of blockersByRecipe){
  if(!pending.has(recipe.id))continue;
  const cleared=new Set(recommended.map(x=>JSON.stringify([x.ingredient,x.unit])));
  if(recipe.blocked.every(b=>cleared.has(JSON.stringify([b.ingredient,b.unit]))))pending.delete(recipe.id);
 }
}
const reasonCounts={};
for(const recipe of blockersByRecipe)for(const b of recipe.blocked)for(const reason of b.reason)reasonCounts[reason]=(reasonCounts[reason]||0)+1;
const out={recipes:recipes.length,fullyReady:blockersByRecipe.filter(x=>!x.remainingIngredientPairs).length,blocked:pending.size,distinctIngredients:Object.keys(sources).length,blockedIngredientUnitPairs:ingredientStats.size,blockedIngredientOccurrences:[...ingredientStats.values()].reduce((s,x)=>s+x.uses,0),blockerOccurrencesByReason:reasonCounts,highestImpactPairs:recommended.slice(0,30),simplestRecipesToUnlock:blockersByRecipe.filter(x=>x.remainingIngredientPairs).sort((a,b)=>a.remainingIngredientPairs-b.remainingIngredientPairs).slice(0,15).map(x=>({id:x.id,name:x.name,remainingIngredientPairs:x.remainingIngredientPairs,needs:x.blocked.map(y=>y.ingredient+' ('+y.unit+')')})),note:'Prioritization report only; candidate foods or grams are not equivalent to an approved and complete nutrition source.',records: blockersByRecipe};
fs.writeFileSync(root+'nutrition-readiness-priority-report.json',JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({recipes:out.recipes,fullyReady:out.fullyReady,blocked:out.blocked,blockedIngredientUnitPairs:out.blockedIngredientUnitPairs,blockedIngredientOccurrences:out.blockedIngredientOccurrences,top5:out.highestImpactPairs.slice(0,5).map(x=>({ingredient:x.ingredient,unit:x.unit,uses:x.uses})),closestRecipes:out.simplestRecipesToUnlock.slice(0,3).map(x=>({name:x.name,remainingPairs:x.remainingIngredientPairs}))}));
if(recipes.length!==110||Object.keys(sources).length!==294||out.fullyReady+out.blocked!==110)process.exitCode=1;
