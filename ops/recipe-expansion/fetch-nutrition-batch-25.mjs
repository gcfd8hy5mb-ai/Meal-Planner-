#!/usr/bin/env node
// 25-ingredient source-evidence batch. USDA search results are CANDIDATES, never automatic approvals.
import fs from 'node:fs';
const root='ops/recipe-expansion/';
const recipes=JSON.parse(fs.readFileSync(root+'batch-01-recipe-drafts.json','utf8')).recipes;
const source=JSON.parse(fs.readFileSync(root+'ingredient-nutrition-sources.json','utf8')).ingredients;
const uses=new Map();
for(const recipe of recipes)for(const [name,,unit] of recipe.ingredients){
 if(source[name]?.reviewStatus==='approved')continue;
 const stat=uses.get(name)||{name,uses:0,recipes:new Set(),units:new Set()};
 stat.uses++;stat.recipes.add(recipe.id);stat.units.add(unit);uses.set(name,stat);
}
const batch=[...uses.values()].sort((a,b)=>b.uses-a.uses||a.name.localeCompare(b.name)).slice(0,25);
if(batch.length!==25)throw Error('Expected 25 unresolved source records');
const tasks=batch.map(x=>({ingredient:x.name,uses:x.uses,recipesAffected:x.recipes.size,requiredUnits:[...x.units].sort(),status:'source-lookup-pending'}));
const out={batchSize:25,approvedBefore:Object.values(source).filter(v=>v.reviewStatus==='approved').length,recipeCount:recipes.length,reviewTasks:tasks,approvalPolicy:'Do not mark approved until matched food identity/state, all macronutrients and each required gram conversion are reviewed.'};
fs.writeFileSync(root+'nutrition-batch-25-review-queue.json',JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({batchSize:out.batchSize,approvedBefore:out.approvedBefore,topFive:tasks.slice(0,5)}));
if(!process.env.USDA_FDC_API_KEY)throw Error('USDA_FDC_API_KEY needed for 25-item lookup');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const lookup=async(url,body=null)=>{
 for(let attempt=0;attempt<3;attempt++){
  try{
   const res=await fetch(url,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(25000)});
   if((res.status===429||res.status>=500)&&attempt<2){await sleep(2500*(attempt+1));continue}
   if(!res.ok)throw Error('USDA HTTP '+res.status);
   return await res.json();
  }catch(e){if(attempt===2)throw e;await sleep(1500*(attempt+1))}
 }
};
const key=encodeURIComponent(process.env.USDA_FDC_API_KEY);
const results=[];
for(const task of tasks){
 try{
  const query=task.ingredient==='Salt'?'salt table':task.ingredient==='Ground cumin'?'spices cumin ground':task.ingredient;
  const found=await lookup('https://api.nal.usda.gov/fdc/v1/foods/search?api_key='+key,{query,pageSize:5,dataType:['SR Legacy','Foundation']});
  const choices=(found.foods||[]).map(x=>({fdcId:x.fdcId,name:x.description,dataType:x.dataType}));
  const best=choices[0]||null;
  let details=null;
  if(best){
   const food=await lookup('https://api.nal.usda.gov/fdc/v1/food/'+best.fdcId+'?api_key='+key);
   details={fdcId:best.fdcId,description:food.description,dataType:food.dataType,
    nutrientCandidates:(food.foodNutrients||[]).filter(n=>[1008,2047,2048,1003,1004,1005].includes(n.nutrient?.id)).map(n=>({id:n.nutrient.id,name:n.nutrient.name,unit:n.nutrient.unitName,amount:n.amount})),
    portions:(food.foodPortions||[]).map(p=>({grams:p.gramWeight,amount:p.amount,unit:p.measureUnit?.name,description:p.portionDescription,modifier:p.modifier}))};
  }
  results.push({...task,query,candidates:choices,firstCandidateDetail:details,verification:'requires-editorial-review',approved:false});
 }catch(error){results.push({...task,error:String(error),approved:false,verification:'fetch-error'})}
}
const report={source:'USDA FoodData Central',requested:25,succeeded:results.filter(r=>r.firstCandidateDetail).length,failed:results.filter(r=>r.error).length,approvedByThisScript:0,review:results,note:'Source evidence from 25 high-use ingredients; top search hit is NOT approved for nutrient or portion calculations. No live recipe data modified.'};
fs.writeFileSync(root+'nutrition-batch-25-usda-evidence.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({requested:25,succeeded:report.succeeded,failed:report.failed,approved:0}));
if(report.succeeded<20)process.exitCode=1;
