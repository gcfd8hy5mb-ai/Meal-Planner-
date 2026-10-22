#!/usr/bin/env node
// Read-only release gate for staged recipe nutrition; no production changes.
import fs from 'node:fs';
const root='ops/recipe-expansion/';
const ingredients=JSON.parse(fs.readFileSync(root+'ingredient-nutrition-sources.json')).ingredients;
const requirements=JSON.parse(fs.readFileSync(root+'nutrition-required-conversions.json')).requirements;
const recipes=JSON.parse(fs.readFileSync(root+'batch-01-recipe-drafts.json')).recipes;
const keys=['kcalPer100g','proteinPer100g','carbsPer100g','fatPer100g'];
const errors=[], blocked=[];
const validDiscard=(name,unit,item)=> name==='Bay leaf'&&unit==='each'&&item?.reviewStatus==='approved'&&item?.state==='Whole bay leaf simmered then discarded'&&item?.gramsPerUnit?.each===0;
for(const {ingredient,requiredUnits} of requirements){
 const item=ingredients[ingredient];
 if(!item){errors.push('Missing ingredient: '+ingredient);continue}
 for(const unit of requiredUnits)if(!(Number.isFinite(item.gramsPerUnit?.[unit])&&item.gramsPerUnit[unit]>0)&&!validDiscard(ingredient,unit,item))errors.push('Missing conversion: '+ingredient+' '+unit);
 if(item.reviewStatus==='approved'&&!validDiscard(ingredient,'each',item)){
  if(!item.source||(!item.foodId&&!item.sourceUrl&&ingredient!=='Water'))errors.push('Missing cited identity: '+ingredient);
  if(keys.some(k=>!Number.isFinite(item[k])||item[k]<0))errors.push('Invalid macros: '+ingredient);
 }
}
for(const recipe of recipes){
 const reasons=[];
 if(!(Number.isFinite(recipe.serv)&&recipe.serv>0))reasons.push('invalid servings');
 for(const [name,amount,unit] of recipe.ingredients){
  const item=ingredients[name];
  if(!Number.isFinite(amount)||amount<=0){reasons.push(name+': invalid amount');continue}
  if(validDiscard(name,unit,item))continue;
  if(!item||item.reviewStatus!=='approved'||!item.source||(!item.foodId&&!item.sourceUrl&&name!=='Water')||!(Number.isFinite(item.gramsPerUnit?.[unit])&&item.gramsPerUnit[unit]>0)||keys.some(k=>!Number.isFinite(item[k])||item[k]<0))reasons.push(name+': missing approved nutrition/portion');
 }
 if(reasons.length)blocked.push({id:recipe.id,name:recipe.name,reasons});
}
const output={ingredientLabels:Object.keys(ingredients).length,requiredUnits:requirements.reduce((n,x)=>n+x.requiredUnits.length,0),recipes:recipes.length,ready:recipes.length-blocked.length,blocked:blocked.length,errors,blockedRecipes:blocked,note:'Coverage/structure gate only. A passing mapping does not independently establish food-identity accuracy, food yield, or prepared-meal macro accuracy.'};
console.log(JSON.stringify(output,null,2));
if(errors.length||blocked.length||recipes.length!==110||Object.keys(ingredients).length!==294)process.exitCode=1;
