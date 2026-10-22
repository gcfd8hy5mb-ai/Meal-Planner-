#!/usr/bin/env node
// Only marks a recipe calculated when EVERY ingredient has audited values and grams per unit.
// Run: node ops/recipe-expansion/calculate-verified-nutrition.mjs
import fs from 'node:fs';
const base='ops/recipe-expansion/';
const draft=JSON.parse(fs.readFileSync(base+'batch-01-recipe-drafts.json','utf8')).recipes;
const source=JSON.parse(fs.readFileSync(base+'ingredient-nutrition-sources.json','utf8')).ingredients;
const estimates={
 'Achiote paste': item => ({gramsPerUnit:{tbsp:item.standardPortionEstimate.assumedGramsPerTbsp},kcalPer100g:item.kcalPer100g,proteinPer100g:item.proteinPer100g,carbsPer100g:item.carbsPer100g,fatPer100g:item.fatPer100g,warning:'Paste brand and tablespoon mass are assumptions.'}),
 'Beef short ribs': item => ({...item.standardCookedEstimate,warning:'Historical raw to cooked edible yield is approximate; braising fat retention varies.'}),
 'Bone-in chicken thighs': item => ({...item.standardCookedEstimate,warning:'USDA standard cooked yield and roasted profile; actual braising and skin retention vary.'}),
 'Chicken wings': item => ({...item.standardCookedEstimate,warning:'USDA whole-wing yield applied to split wings; actual edible yield varies.'}),
 'Chili garlic sauce': item => ({gramsPerUnit:{tbsp:item.standardPortionEstimate.assumedGramsPerTbsp},kcalPer100g:20,proteinPer100g:0,carbsPer100g:5,fatPer100g:0,warning:'Provisional 3kcal and 0.75g carbs per tbsp; inconsistent rounded labels.'}),
 'Ranch seasoning': item => ({gramsPerUnit:item.gramsPerUnit,kcalPer100g:300,proteinPer100g:0,carbsPer100g:60,fatPer100g:0,warning:'Provisional seasoning profile based on rounded label approximations; not exact.'}),
 'Pork baby back ribs': item => ({...item.standardCookedEstimate,gramsPerUnit:{lb:453.59237*0.45},warning:'UNSOURCED 45% cooked edible yield scenario for purchased baby back ribs; not verified.'})
};
const output=[];
for(const r of draft){
 let totals={cal:0,p:0,c:0,f:0},issues=[],estimateWarnings=[];
 if(!Number.isFinite(r.serv)||r.serv<=0)issues.push('invalid servings');
 for(const [name,amount,unit] of r.ingredients){
  const item=source[name];
  if(!item){issues.push('ingredient not mapped: '+name);continue}
  if(!Number.isFinite(amount)||amount<=0){issues.push('invalid ingredient quantity: '+name);continue}
  if(item.state==='Whole bay leaf simmered then discarded'&&name==='Bay leaf'&&item.reviewStatus==='approved'&&item.gramsPerUnit?.[unit]===0){continue}
  let nutrient=item;
  if(item.reviewStatus!=='approved'){
    if(estimates[name] && item.reviewStatus==='needs-review'){
      nutrient=estimates[name](item);
      estimateWarnings.push({ingredient:name,warning:nutrient.warning});
    }else{issues.push('source unverified: '+name);continue}
  }else if(!item.source||(!item.foodId&&!item.sourceUrl&&name!=='Water')){issues.push('source unverified: '+name);continue}
  const g=nutrient.gramsPerUnit?.[unit];
  if(!Number.isFinite(g)||g<=0){issues.push('missing grams/unit: '+name+' ('+unit+')');continue}
  const nutrientNames={cal:'kcalPer100g',p:'proteinPer100g',c:'carbsPer100g',f:'fatPer100g'};
  if(Object.values(nutrientNames).some(k=>!Number.isFinite(nutrient[k])||nutrient[k]<0)){
    issues.push('missing nutrient data: '+name);continue
  }
  for(const [key,nkey] of Object.entries(nutrientNames))totals[key]+=amount*g*nutrient[nkey]/100;
 }
 const calculable=issues.length===0;
 const ready=calculable&&estimateWarnings.length===0;
 const perServing=calculable?Object.fromEntries(Object.entries(totals).map(([k,v])=>[k,Math.round(v/r.serv*10)/10])):null;
 output.push({id:r.id,name:r.name,servings:r.serv,verified:ready,estimateOnly:calculable&&!ready,status:ready?'structurally-complete':calculable?'estimated':'blocked',perServing,issues,estimateWarnings});
}
const verified=output.filter(x=>x.verified).length;
const estimated=output.filter(x=>x.estimateOnly).length;
const blocked=output.filter(x=>x.status==='blocked').length;
const summary={recipes:output.length,verified,estimated,blocked,note:'Here verified means structurally complete ingredient mappings, NOT independently verified recipe macros. Cooking yields, product matches and unrounded source values require a separate accuracy review.',results:output};
fs.writeFileSync(base+'nutrition-calculation-report.json',JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({recipes:output.length,verified,estimated,blocked,example:output[0]},null,2));
if(blocked>0)process.exitCode=1; // Exact-macro release gate is intentionally separate.
