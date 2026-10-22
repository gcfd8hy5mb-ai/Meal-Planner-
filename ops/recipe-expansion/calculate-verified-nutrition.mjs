#!/usr/bin/env node
// Only marks a recipe calculated when EVERY ingredient has audited values and grams per unit.
// Run: node ops/recipe-expansion/calculate-verified-nutrition.mjs
import fs from 'node:fs';
const base='ops/recipe-expansion/';
const draft=JSON.parse(fs.readFileSync(base+'batch-01-recipe-drafts.json','utf8')).recipes;
const source=JSON.parse(fs.readFileSync(base+'ingredient-nutrition-sources.json','utf8')).ingredients;
const output=[];
for(const r of draft){
 let totals={cal:0,p:0,c:0,f:0},issues=[];
 if(!Number.isFinite(r.serv)||r.serv<=0)issues.push('invalid servings');
 for(const [name,amount,unit] of r.ingredients){
  const item=source[name];
  if(!item){issues.push('ingredient not mapped: '+name);continue}
  if(!Number.isFinite(amount)||amount<=0){issues.push('invalid ingredient quantity: '+name);continue}
  if(item.state==='Whole bay leaf simmered then discarded'&&name==='Bay leaf'&&item.reviewStatus==='approved'&&item.gramsPerUnit?.[unit]===0){continue}
  if(item.reviewStatus!=='approved'||!item.source||(!item.foodId&&!item.sourceUrl&&name!=='Water')){issues.push('source unverified: '+name);continue}
  const g=item.gramsPerUnit?.[unit];
  if(!Number.isFinite(g)||g<=0){issues.push('missing grams/unit: '+name+' ('+unit+')');continue}
  const nutrientNames={cal:'kcalPer100g',p:'proteinPer100g',c:'carbsPer100g',f:'fatPer100g'};
  if(Object.values(nutrientNames).some(k=>!Number.isFinite(item[k])||item[k]<0)){
    issues.push('missing nutrient data: '+name);continue
  }
  for(const [key,nkey] of Object.entries(nutrientNames))totals[key]+=amount*g*item[nkey]/100;
 }
 const ready=issues.length===0;
 const perServing=ready?Object.fromEntries(Object.entries(totals).map(([k,v])=>[k,Math.round(v/r.serv*10)/10])):null;
 output.push({id:r.id,name:r.name,servings:r.serv,verified:ready,perServing,issues});
}
const verified=output.filter(x=>x.verified).length;
const summary={recipes:output.length,verified,blocked:output.length-verified,note:'Here verified means structurally complete ingredient mappings, NOT independently verified recipe macros. Cooking yields, product matches and unrounded source values require a separate accuracy review.',results:output};
fs.writeFileSync(base+'nutrition-calculation-report.json',JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({recipes:output.length,verified,blocked:output.length-verified,example:output[0]},null,2));
if(verified!==110)process.exitCode=1; // Release gate remains red while flagged foods appear in recipes.
