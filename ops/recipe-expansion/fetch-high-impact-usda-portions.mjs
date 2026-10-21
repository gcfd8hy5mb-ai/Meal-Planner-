#!/usr/bin/env node
// Collect USDA candidate identities and portion weights for the ten most-used unresolved measures.
// Never approve food identities, nutrients or gram conversions automatically.
import fs from 'node:fs';
const base='ops/recipe-expansion/';
const key=process.env.USDA_FDC_API_KEY;
if(!key)throw Error('Missing USDA_FDC_API_KEY');
const queue=JSON.parse(fs.readFileSync(base+'ingredient-portion-review-queue.json','utf8')).queue;
const top=queue.slice(0,10);
const searchAliases={
 'Garlic cloves':'garlic raw',
 'Yellow onion':'onions raw',
 'Ground cumin':'spices cumin seed ground',
 'Chicken broth':'chicken broth ready to serve',
 'Chili powder':'spices chili powder',
 'Cilantro':'coriander cilantro leaves raw',
 'Lime':'limes raw',
 'Salt':'salt table',
 'Olive oil':'oil olive salad or cooking',
 'Butter':'butter salted'
};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function getJson(url,body){
 for(let attempt=0;attempt<3;attempt++){
  try{
   const response=await fetch(url,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(20000)});
   if(!response.ok){
    if((response.status===429||response.status>=500)&&attempt<2){await wait(2000*2**attempt);continue}
    throw Error('USDA HTTP '+response.status);
   }
   return await response.json();
  }catch(e){if(attempt===2)throw e;await wait(2000*2**attempt)}
 }
}
const output=[];
for(const entry of top){
 const query=searchAliases[entry.ingredient]||entry.ingredient;
 const search=await getJson('https://api.nal.usda.gov/fdc/v1/foods/search?api_key='+encodeURIComponent(key),
  {query,pageSize:4,dataType:['Foundation','SR Legacy','Survey (FNDDS)']});
 const candidates=[];
 for(const item of (search.foods||[]).slice(0,3)){
  const food=await getJson('https://api.nal.usda.gov/fdc/v1/food/'+item.fdcId+'?api_key='+encodeURIComponent(key));
  candidates.push({fdcId:item.fdcId,description:food.description,dataType:food.dataType,
    foodPortions:(food.foodPortions||[]).map(p=>({gramWeight:p.gramWeight??null,amount:p.amount??null,
      measureUnit:p.measureUnit?.name??null,modifier:p.modifier??null,portionDescription:p.portionDescription??null})),
    nutrientFacts:(food.foodNutrients||[]).filter(n=>/^(1008|2047|2048|1003|1004|1005)$/.test(String(n.nutrient?.id??'')) ||
    ['208','203','204','205'].includes(String(n.nutrient?.number??''))).map(n=>({id:n.nutrient?.id,name:n.nutrient?.name,unit:n.nutrient?.unitName,amount:n.amount}))});
 }
 output.push({ingredient:entry.ingredient,unit:entry.unit,recipeUses:entry.recipeUses,searchQuery:query,
  candidates,reviewStatus:'unapproved',gramsPerUnit:null});
}
const report={ingredientUnitPairs:output.length,totalRecipeUses:output.reduce((s,x)=>s+x.recipeUses,0),
 note:'USDA search results and portions only. Do not choose the first result automatically. Confirm exact food identity, preparation, edible portion, nutrient basis, and source before approval.',results:output};
fs.writeFileSync(base+'high-impact-usda-portion-candidates.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({checked:output.length,recipeUses:report.totalRecipeUses,withSearchCandidates:output.filter(x=>x.candidates.length).length,withPortionRows:output.filter(x=>x.candidates.some(c=>c.foodPortions.length)).length,approved:0}));
if(output.length!==10||output.some(x=>x.candidates.length===0))process.exitCode=1;
