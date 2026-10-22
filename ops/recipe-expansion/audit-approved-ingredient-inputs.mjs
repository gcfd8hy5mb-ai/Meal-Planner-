#!/usr/bin/env node
// Audits approved USDA ingredient inputs without claiming recipe nutrition is complete.
import assert from 'node:assert/strict';
import fs from 'node:fs';
const prefix='ops/recipe-expansion/';
const ingredients=JSON.parse(fs.readFileSync(prefix+'ingredient-nutrition-sources.json','utf8')).ingredients;
const recipes=JSON.parse(fs.readFileSync(prefix+'batch-01-recipe-drafts.json','utf8')).recipes;
const nutritionKeys=['kcalPer100g','proteinPer100g','carbsPer100g','fatPer100g'];
const approved=Object.entries(ingredients).filter(([name,v])=>v.reviewStatus==='approved');
const usage=[];
for(const [name,item] of approved){
 assert.match(String(item.source),/USDA FoodData Central/,'Approved source must identify database: '+name);
 assert.match(String(item.foodId),/^[0-9]+$/,'Approved FDC ID required: '+name);
 for(const key of nutritionKeys)assert(Number.isFinite(item[key])&&item[key]>=0,'Invalid '+key+' for '+name);
 const units=new Set(recipes.flatMap(r=>r.ingredients.filter(i=>i[0]===name).map(i=>i[2])));
 assert(units.size>0,'Unused approved ingredient: '+name);
 for(const unit of units)assert(Number.isFinite(item.gramsPerUnit[unit])&&item.gramsPerUnit[unit]>0,'Missing edible grams for '+name+' '+unit);
 usage.push({ingredient:name,recipesAffected:recipes.filter(r=>r.ingredients.some(i=>i[0]===name)).length,gramsPerUnit:item.gramsPerUnit,foodId:item.foodId});
}
assert.equal(ingredients['Garlic cloves'].foodId,'169230');
assert.equal(ingredients['Garlic cloves'].gramsPerUnit.each,3);
assert.deepEqual(nutritionKeys.map(k=>ingredients['Garlic cloves'][k]),[149,6.36,33.06,0.5]);
const verifiedRecipes=recipes.filter(r=>r.ingredients.every(i=>ingredients[i[0]]?.reviewStatus==='approved'));
const report={recipes:recipes.length,ingredientLabels:Object.keys(ingredients).length,approvedIngredientLabels:approved.length,unapprovedIngredientLabels:Object.keys(ingredients).length-approved.length,verifiedRecipeIngredientCompleteness:verifiedRecipes.length,approvedSourceUsage:usage,note:'Approved raw ingredient source values are not equal to verified prepared-meal nutrition; final recipes must account for edible retained portions and preparation yields.'};
fs.writeFileSync(prefix+'approved-ingredient-audit.json',JSON.stringify(report,null,2)+'\n');
assert.equal(report.recipes,110);
assert.equal(report.ingredientLabels,294);
assert.equal(report.verifiedRecipeIngredientCompleteness,0,'Do not prematurely approve recipe nutrition.');
console.log(JSON.stringify(report));
