#!/usr/bin/env node
// Structural audit of approved ingredient nutrition and its use in staged recipes.
// Checks data completeness; external source identity and cooking yields still require verification.
import assert from 'node:assert/strict';
import fs from 'node:fs';
const dir='ops/recipe-expansion/';
const ingredients=JSON.parse(fs.readFileSync(dir+'ingredient-nutrition-sources.json','utf8')).ingredients;
const recipes=JSON.parse(fs.readFileSync(dir+'batch-01-recipe-drafts.json','utf8')).recipes;
const requirements=JSON.parse(fs.readFileSync(dir+'nutrition-required-conversions.json','utf8')).requirements;
const nutrients=['kcalPer100g','proteinPer100g','carbsPer100g','fatPer100g'];
const validDiscard=(name,unit,item)=>name==='Bay leaf'&&unit==='each'&&item?.reviewStatus==='approved'&&item?.state==='Whole bay leaf simmered then discarded'&&item?.gramsPerUnit?.each===0;
const approved=Object.entries(ingredients).filter(([name,v])=>v.reviewStatus==='approved');
const dataProblems=[], usage=[];
for(const [name,item] of approved){
 if(!item.source||(!item.foodId&&!item.sourceUrl&&name!=='Water'&&name!=='Bay leaf'))dataProblems.push(name+': missing source identity');
 for(const key of nutrients)if(!Number.isFinite(item[key])||item[key]<0)dataProblems.push(name+': invalid '+key);
 const rows=recipes.flatMap(r=>r.ingredients.filter(i=>i[0]===name));
 if(!rows.length)dataProblems.push(name+': unused approved ingredient');
 for(const [,amount,unit] of rows){
  if(!(Number.isFinite(amount)&&amount>0))dataProblems.push(name+': invalid quantity');
  if(!(Number.isFinite(item.gramsPerUnit?.[unit])&&item.gramsPerUnit[unit]>0)&&!validDiscard(name,unit,item))dataProblems.push(name+': invalid grams per '+unit);
 }
 usage.push({ingredient:name,recipesAffected:recipes.filter(r=>r.ingredients.some(i=>i[0]===name)).length,foodId:item.foodId||null,source:item.source});
}
for(const {ingredient,requiredUnits} of requirements){
 const item=ingredients[ingredient];
 if(!item){dataProblems.push(ingredient+': missing ingredient');continue;}
 for(const unit of requiredUnits)if(!(Number.isFinite(item.gramsPerUnit?.[unit])&&item.gramsPerUnit[unit]>0)&&!validDiscard(ingredient,unit,item))dataProblems.push(ingredient+': missing required '+unit);
}
const blockedRecipes=recipes.filter(r=>r.ingredients.some(([name,amount,unit])=>!Number.isFinite(amount)||amount<=0||(!validDiscard(name,unit,ingredients[name])&&ingredients[name]?.reviewStatus!=='approved')));
const report={recipes:recipes.length,ingredientLabels:Object.keys(ingredients).length,approvedIngredientLabels:approved.length,unapprovedIngredientLabels:Object.keys(ingredients).length-approved.length,recipeMappingComplete:recipes.length-blockedRecipes.length,blockedRecipeCount:blockedRecipes.length,blockedRecipeNames:blockedRecipes.map(x=>x.name),dataProblems,approvedSourceUsage:usage,note:'Mapping/structural completeness only. Product, source ID, retention and edible-yield accuracy are not independently certified.'};
fs.writeFileSync(dir+'approved-ingredient-audit.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({recipes:report.recipes,approved:report.approvedIngredientLabels,recipeMappingComplete:report.recipeMappingComplete,blockedRecipes:report.blockedRecipeCount,dataProblems:report.dataProblems},null,2));
assert.equal(report.recipes,110);
assert.equal(report.ingredientLabels,294);
assert.deepEqual(dataProblems,[],'Structural problems in approved ingredient data');
assert.ok(report.blockedRecipeCount>0,'Review release gate before claiming all recipes are verified');
