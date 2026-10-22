#!/usr/bin/env node
// Rank unresolved recipe ingredient-specific portion measurements for source review.
// This file is a queue; it never supplies guessed weights or approves nutrition.
import fs from 'node:fs';
const base='ops/recipe-expansion/';
const recipes=JSON.parse(fs.readFileSync(base+'batch-01-recipe-drafts.json','utf8')).recipes;
const sources=JSON.parse(fs.readFileSync(base+'ingredient-nutrition-sources.json','utf8')).ingredients;
const exact=new Set(['g','kg','oz','lb']);
const groups=new Map();
const risky=/(shredded|chopped|diced|minced|packed|dry|dried|cooked|raw|drained|grated|sliced|frozen|crushed|panko|canned|cooked|large|small)/i;
for(const recipe of recipes){
 for(const [ingredient,quantity,unit] of recipe.ingredients){
  if(exact.has(unit))continue;
  const key=JSON.stringify([ingredient,unit]);
  const record=groups.get(key)??{ingredient,unit,recipeUses:0,recipes:[],quantityExamples:new Set()};
  record.recipeUses++;
  record.recipes.push({name:recipe.name,id:recipe.id});
  record.quantityExamples.add(quantity);
  groups.set(key,record);
 }
}
const weight=({unit,ingredient,recipeUses})=>{
 const unitPriority={cup:10,each:9,tbsp:8,tsp:7,head:6,slice:5,can:4}[unit]??1;
 return recipeUses*100+unitPriority+(risky.test(ingredient)?15:0);
};
const queue=[...groups.values()].map(({quantityExamples,...item})=>{
 const already=sources[item.ingredient]?.gramsPerUnit?.[item.unit];
 return {...item,quantityExamples:[...quantityExamples],risk:risky.test(item.ingredient)?'state-or-cut-specific':'portion-definition-specific',
   sourceNeeded:item.unit==='can'?'Product size and drained/net weight':'Documented edible grams per recipe unit, with preparation state',
   priority:weight(item),gramsPerUnit:null,status:'needs-source-review',
   existingApprovedConversion:Number.isFinite(already)&&already>0?already:null};
}).sort((a,b)=>b.priority-a.priority||a.ingredient.localeCompare(b.ingredient));
const report={recipes:recipes.length,unresolvedPairs:queue.length,ingredientUses:queue.reduce((n,x)=>n+x.recipeUses,0),
 note:'This is a prioritized REVIEW QUEUE, not a food weight or nutrition database. Do not infer grams from unit names alone.',queue};
fs.writeFileSync(base+'ingredient-portion-review-queue.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({recipes:report.recipes,unresolvedPairs:report.unresolvedPairs,ingredientUses:report.ingredientUses,topTen:queue.slice(0,10).map(x=>({ingredient:x.ingredient,unit:x.unit,uses:x.recipeUses}))}));
if(report.recipes!==110||report.unresolvedPairs!==220)process.exitCode=1;
