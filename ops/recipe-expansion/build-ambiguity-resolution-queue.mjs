#!/usr/bin/env node
// Require ingredient-specific consumption rules instead of treating every whole lime
// or onion as fully edible. Never changes recipes or approves nutrition.
import fs from 'node:fs';
const root='ops/recipe-expansion/';
const report=JSON.parse(fs.readFileSync(root+'usda-three-ambiguities-review.json','utf8'));
const recipes=JSON.parse(fs.readFileSync(root+'batch-01-recipe-drafts.json','utf8')).recipes;
const policies={
 'Ground cumin':{measurement:'tsp',required:'Find a USDA ground-cumin teaspoon weight. Never use whole cumin-seed density or a generic spice.',needsRecipeEdit:false},
 'Yellow onion':{measurement:'each',required:'Specify small/medium/large raw edible onion size per recipe, or replace each with a weighed amount.',needsRecipeEdit:true},
 'Lime':{measurement:'each',required:'Specify juice volume actually used, separated from optional garnish wedges. Whole-fruit weight is not the edible juice amount.',needsRecipeEdit:true}
};
const proposals=[];
for(const item of report.results){
 const policy=policies[item.ingredient];
 if(!policy)throw Error('Unexpected ingredient '+item.ingredient);
 const foodRecords=item.candidateFoodRecords||[];
 const evidence=foodRecords.flatMap(food=>(food.foodPortions||[]).map(portion=>({
   fdcId:food.fdcId,food:food.description,...portion
 })));
 for(const use of item.recipeUses){
  const recipe=recipes.find(r=>r.id===use.recipeId);
  if(!recipe)throw Error('Missing recipe '+use.recipeId);
  const review=policy.needsRecipeEdit?'editorial-clarification-needed':'food-portion-source-needed';
  proposals.push({recipeId:use.recipeId,recipe:use.recipe,ingredient:item.ingredient,
   quantity:use.amount,unit:use.unit,useType:use.useType,
   recommendedAction:item.ingredient==='Lime'&&use.useType==='wedges-served'
     ?'Mark wedges as optional accompaniment and do not count a whole lime as consumed'
     :item.ingredient==='Lime'&&use.useType==='juice-and-wedges'
     ?'Split ingredient into measured juice used and optional lime wedges'
     :item.ingredient==='Lime'&&use.useType==='juice-used'
     ?'Specify tablespoons of lime juice actually added'
     :item.ingredient==='Yellow onion'
     ?'Specify onion size or raw edible gram mass'
     :item.ingredient==='Ground cumin'&&use.useType==='potentially-discarded-in-marinade'
     ?'Document marinade discard/retention and confirm ground cumin teaspoon mass'
     :policy.required,
   sourcePortions:evidence.filter(p=>p.gramWeight>0),proposedConsumedGrams:null,
   revisionNeeded:review,approved:false});
 }
}
const statuses=Object.fromEntries(Object.keys(policies).map(name=>[name,{
 uses:proposals.filter(p=>p.ingredient===name).length,
 candidatePortions:report.results.find(r=>r.ingredient===name).candidateFoodRecords.reduce((n,f)=>n+(f.foodPortions||[]).length,0),
 blocked:true
}]));
const output={recipes:recipes.length,recipeUses:proposals.length,
 reviewPolicies:statuses,fullyVerified:0,notes:'This is an editorial revision queue. USDA portion candidates do not establish edible amounts or recipe nutrition. Do not insert guessed serving weights.',proposals};
fs.writeFileSync(root+'high-impact-ambiguity-resolution-queue.json',JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({recipes:output.recipes,recipeUses:output.recipeUses,reviewPolicies:statuses,fullyVerified:0}));
if(output.recipes!==110||output.recipeUses!==98)process.exitCode=1;
