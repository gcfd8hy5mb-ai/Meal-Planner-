// Explicit development-only check against TheMealDB's documented public test key.
// This script must never be bundled into the client or deployed as an endpoint.
import assert from 'node:assert/strict';
import {createMealDbProvider,normalizeRemoteMeal,rankRemoteMeals} from '../luxury-v2/online-recipe-provider.mjs';
const controller=new AbortController();
const timeout=setTimeout(()=>controller.abort(),12000);
try{
 const url='https://www.themealdb.com/api/json/v1/1/lookup.php?i=52772';
 const response=await fetch(url,{headers:{Accept:'application/json'},signal:controller.signal});
 assert.equal(response.status,200,'public test API lookup should be reachable');
 const body=await response.json();
 assert.ok(Array.isArray(body.meals)&&body.meals.length>0,'recipe details must include meals');
 const first=normalizeRemoteMeal(body.meals[0]);
 assert.ok(first?.id&&first.name,'recipe id and name');
 assert.ok(first.ingredients.length>0,'recipe ingredient names');
 assert.ok(first.ingredients.some(x=>x.amount),'recipe quantities');
 assert.ok(first.instructions.length>50,'nontrivial cooking instructions');
 assert.ok(first.attribution==='TheMealDB','provider attribution');
 // No production provider key or Tablewise live endpoint contacted.
 const provider=createMealDbProvider({fetcher:(...args)=>fetch(...args),apiKey:'1'});
 const ranked=rankRemoteMeals([first],first.ingredients.map(x=>x.name),{maxMissing:0});
 assert.equal(ranked.length,1,'known pantry ingredients match live recipe');
 console.log(JSON.stringify({result:'PASS',provider:'TheMealDB developer API',sampleId:first.id,name:first.name,ingredientCount:first.ingredients.length,instructionsLength:first.instructions.length,pantryMatch:ranked[0].have}));
}catch(error){
 console.error('Live development API verification failed:',error.message);
 process.exitCode=1;
}finally{clearTimeout(timeout)}
