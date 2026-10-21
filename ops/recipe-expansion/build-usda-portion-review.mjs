#!/usr/bin/env node
// Pair USDA portion records with actual recipe units for editorial review, without auto-approval.
import fs from 'node:fs';
const root='ops/recipe-expansion/';
const details=JSON.parse(fs.readFileSync(root+'usda-focused-nutrient-details.json','utf8')).sourceRecords;
const entries=JSON.parse(fs.readFileSync(root+'usda-focused-identity-review.json','utf8')).results;
const recipes=JSON.parse(fs.readFileSync(root+'batch-01-recipe-drafts.json','utf8')).recipes;
const byId=new Map(details.map(x=>[x.fdcId,x]));
const results=[];
for(const entry of entries){
 const units=[...new Set(recipes.flatMap(r=>r.ingredients.filter(i=>i[0]===entry.ingredient).map(i=>i[2])))];
 if(!units.length)continue;
 const food=byId.get(entry.candidateFdcId);
 for(const unit of units){
  const portions=food?.foodPortions??[];
  const relevant=portions.filter(p=>{
   const label=[p.measureUnit,p.modifier,p.portionDescription].filter(Boolean).join(' ').toLowerCase();
   if(unit==='cup')return /\bcup\b/.test(label);
   if(unit==='each')return /\b(each|whole|unit|piece|fruit|pepper|lemon|apple)\b/.test(label);
   return false;
  });
  results.push({ingredient:entry.ingredient,unit,fdcId:entry.candidateFdcId,
   identityStatus:entry.status,usdaPortionRecords:portions.length,
   plausiblePortionRows:relevant,
   proposedGramsPerUnit:null,reviewStatus:'pending',
   note:unit==='oz'?'Exact mass unit can be converted separately; this file never authorizes nutrient values.':'Check USDA portions against recipe preparation, density, edible yield and portion definition; never accept automatically.'});
 }
}
const report={checkedPairs:results.length,pairsWithPlausibleUsdaPortions:results.filter(x=>x.plausiblePortionRows.length>0).length,
 approvedPairs:0,results,
 note:'USDA foodPortions are raw source data. Portion units are not interchangeable with recipe units without editorial verification.'};
fs.writeFileSync(root+'usda-portion-review.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({checkedPairs:report.checkedPairs,pairsWithPlausibleUsdaPortions:report.pairsWithPlausibleUsdaPortions,approvedPairs:0}));
if(report.checkedPairs!==12)process.exitCode=1;
