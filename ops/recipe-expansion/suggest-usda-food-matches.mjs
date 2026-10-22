#!/usr/bin/env node
// USDA ingredient candidate lookup. Never approves food matches or nutrition numbers.
// Usage: USDA_FDC_API_KEY=... node ops/recipe-expansion/suggest-usda-food-matches.mjs [limit] [offset]
// DEMO_KEY is for a small pilot only; for bulk retrieval configure a personal USDA key.
import fs from 'node:fs';
const dir='ops/recipe-expansion/';
const data=JSON.parse(fs.readFileSync(dir+'ingredient-nutrition-sources.json','utf8'));
const key=process.env.USDA_FDC_API_KEY || 'DEMO_KEY';
const demo=key==='DEMO_KEY';
const limit=Math.min(demo?10:300,Math.max(1,Number(process.argv[2])||10));
const offset=Math.max(0,Number(process.argv[3])||0);
const focus=process.env.USDA_FOCUS_INGREDIENTS?.split('|').filter(Boolean);
const entries=Object.entries(data.ingredients).filter(([,v])=>v.reviewStatus!=='approved');
const todo=focus?entries.filter(([name])=>focus.includes(name)):entries.slice(offset,offset+limit);
if(focus && todo.length!==focus.length)throw Error('Unknown or repeated ingredient name in USDA_FOCUS_INGREDIENTS');
if(focus && demo && todo.length>10)throw Error('Dedicated USDA_FDC_API_KEY required for focused review of more than ten ingredients');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const suggestions=[];
const queryAliases={'Breadcrumbs':'bread crumbs dry plain','Jalapeño':'jalapeno pepper raw','Panko breadcrumbs':'panko bread crumbs','Achiote paste':'annatto paste','Apples':'apples raw with skin','Dried guajillo chiles':'guajillo peppers dried','Dry breadcrumbs':'bread crumbs dry plain','Dry fettuccine':'pasta fettuccine dry','Dry linguine':'pasta linguine dry','Dry orzo':'pasta orzo dry','Lemons':'lemons raw'};
for(const [name] of todo){
 let result=null;
 for(let attempt=0;attempt<3;attempt++){
  try{
   const response=await fetch('https://api.nal.usda.gov/fdc/v1/foods/search?api_key='+encodeURIComponent(key),{
    method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(20000),
    body:JSON.stringify({query:queryAliases[name]||name,pageSize:5,dataType:['Foundation','SR Legacy','Survey (FNDDS)']})
   });
   if(response.status===429 || response.status>=500){
    const retry=response.headers.get('retry-after');
    if(attempt<2){await sleep(retry&&/^\d+$/.test(retry)?Math.min(60000,Number(retry)*1000):Math.min(30000,2500*2**attempt));continue}
   }
   if(!response.ok)throw Error('USDA HTTP '+response.status);
   const json=await response.json();
   result={ingredient:name,searchQuery:queryAliases[name]||name,candidates:(json.foods||[]).map(f=>({fdcId:f.fdcId,description:f.description,dataType:f.dataType,publicationDate:f.publicationDate})),status:'review-required'};
   break;
  }catch(e){
   if(attempt===2)result={ingredient:name,error:String(e),status:'fetch-error'};
   else await sleep(1500*2**attempt);
  }
 }
 suggestions.push(result??{ingredient:name,error:'Retries exhausted',status:'fetch-error'});
 if(demo)await sleep(1500);
}
const output=dir+(focus?'usda-focused-review.json':'usda-food-suggestions.json');
fs.writeFileSync(output,JSON.stringify({source:'USDA FoodData Central',offset,requested:todo.length,note:'Candidates only, NOT VERIFIED nutrition. Review every source, gram conversion, nutrient and serving.',suggestions},null,2)+'\n');
const success=suggestions.filter(x=>x.candidates).length;
const errors=suggestions.length-success;
console.log(JSON.stringify({requested:todo.length,suggestions:success,errors,output}));
if(errors)process.exitCode=1;
