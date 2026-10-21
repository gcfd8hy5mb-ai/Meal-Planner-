#!/usr/bin/env node
// USDA FoodData Central mapping assistant. It suggests candidates, NEVER auto-approves them.
// Usage: USDA_FDC_API_KEY=... node ops/recipe-expansion/suggest-usda-food-matches.mjs [limit=20]
// Keep keys in the environment; never commit API keys or automatic nutrition estimates.
import fs from 'node:fs';
const dir='ops/recipe-expansion/';
const data=JSON.parse(fs.readFileSync(dir+'ingredient-nutrition-sources.json','utf8'));
const key=process.env.USDA_FDC_API_KEY || 'DEMO_KEY';
// DEMO_KEY is USDA's published low-quota public example key. Override with a secret for scale.
const limit=Math.min(300,Math.max(1,Number(process.argv[2])||20));
const offset=Math.max(0,Number(process.argv[3])||0);
const todo=Object.entries(data.ingredients).filter(([,v])=>v.reviewStatus!=='approved').slice(offset,offset+limit);
const suggestions=[];
for(const [name] of todo){
 try{
  const response=await fetch('https://api.nal.usda.gov/fdc/v1/foods/search?api_key='+encodeURIComponent(key),{
    method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(20000),
    body:JSON.stringify({query:name,pageSize:5,dataType:['Foundation','SR Legacy','Survey (FNDDS)']})
  });
  if(!response.ok)throw Error('USDA HTTP '+response.status);
  const json=await response.json();
  suggestions.push({ingredient:name,candidates:(json.foods||[]).map(f=>({fdcId:f.fdcId,description:f.description,dataType:f.dataType,publicationDate:f.publicationDate})),status:'review-required'});
 }catch(e){suggestions.push({ingredient:name,error:String(e),status:'fetch-error'})}
}
fs.writeFileSync(dir+'usda-food-suggestions.json',JSON.stringify({source:'USDA FoodData Central',note:'Candidates only. Review edible portion, state, serving weight, and nutrients before manually marking ingredient approved.',suggestions},null,2)+'\n');
const success=suggestions.filter(x=>x.candidates).length;
console.log(JSON.stringify({requested:todo.length,suggestions:success,errors:suggestions.filter(x=>x.error).length,output:dir+'usda-food-suggestions.json'}));
if(!success)process.exitCode=1;
