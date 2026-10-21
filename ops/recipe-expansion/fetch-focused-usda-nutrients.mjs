#!/usr/bin/env node
// Fetch nutrient details for manually screened USDA candidates; never marks an ingredient approved.
import fs from 'node:fs';
const dir='ops/recipe-expansion/';
const input=JSON.parse(fs.readFileSync(dir+'usda-focused-identity-review.json','utf8'));
const key=process.env.USDA_FDC_API_KEY;
if(!key)throw Error('USDA_FDC_API_KEY is required');
const chosen=input.results.filter(x=>x.candidateFdcId!==null);
const unique=[...new Set(chosen.map(x=>x.candidateFdcId))];
const out=[];
for(const id of unique){
 let response=await fetch('https://api.nal.usda.gov/fdc/v1/food/'+id+'?api_key='+encodeURIComponent(key),{signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw Error('USDA detail request failed with HTTP '+response.status+' for ID '+id);
 const f=await response.json();
 const nutrients=(f.foodNutrients||[]).map(n=>({name:n.nutrient?.name??n.nutrientName??null,number:n.nutrient?.number??null,unit:n.nutrient?.unitName??n.unitName??null,amount:n.amount??n.value??null})).filter(n=>n.name);
 out.push({fdcId:id,description:f.description,dataType:f.dataType,nutrients,reviewStatus:'not-approved'});
}
const report={source:'USDA FoodData Central',foodRecords:out.length,ingredientCandidates:chosen.length,sourceRecords:out,note:'Raw USDA details for review only. No grams/unit, edible portions or food-state approval. Do not mark recipes verified.'};
fs.writeFileSync(dir+'usda-focused-nutrient-details.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({uniqueFoods:unique.length,ingredientCandidates:chosen.length,missingNutrients:out.filter(x=>!x.nutrients.length).map(x=>x.fdcId)}));
