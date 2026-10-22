import test from 'node:test';
import assert from 'node:assert/strict';
import {onRequest} from '../functions/api/recipes.js';
import {handleRecipeRequest} from '../ops/recipe-search/worker.mjs';
const meal={idMeal:'12345',strMeal:'Chicken Tacos',strArea:'Mexican',strCategory:'Chicken',strInstructions:'Cook the chicken, then fill tortillas.',strIngredient1:'Chicken',strMeasure1:'1 lb',strIngredient2:'Tortilla',strMeasure2:'4'};
const upstream=async url=>({ok:true,json:async()=>String(url).includes('lookup.php')?{meals:[meal]}:{meals:[{idMeal:'12345'}]}});
const req=(query='?ingredients=chicken,tortilla&type=Mexican&maxMissing=0')=>new Request('https://tablewise-luxury-preview.pages.dev/api/recipes'+query,{headers:{'CF-Connecting-IP':'192.0.2.10'}});
test('complete Pages-to-private-Worker path returns instructions and ingredient amounts',async()=>{
 let providerCalls=0;
 const env={TABLEWISE_RECIPE_SERVICE:{fetch:(request)=>handleRecipeRequest(request,{RECIPE_API_KEY:'test-only',RECIPE_RATE_LIMITER:{limit:async()=>({success:true})}},async url=>{providerCalls++;return upstream(url)})}};
 const response=await onRequest({request:req(),env});
 assert.equal(response.status,200);
 const data=await response.json();assert.equal(data.recipes.length,1);assert.equal(data.recipes[0].ingredients[0].amount,'1 lb');
 assert.match(data.recipes[0].instructions,/Cook the chicken/);assert.equal(providerCalls,2);
});
test('private Worker returns 429 via Pages without contacting recipe provider',async()=>{
 let called=false;
 const env={TABLEWISE_RECIPE_SERVICE:{fetch:(request)=>handleRecipeRequest(request,{RECIPE_API_KEY:'test-only',RECIPE_RATE_LIMITER:{limit:async()=>({success:false})}},async()=>{called=true;throw Error('must not happen')})}};
 const response=await onRequest({request:req(),env});assert.equal(response.status,429);assert.equal(called,false);
});
test('unsupported cuisines never silently return unrelated recipes',async()=>{
 let called=false;
 const env={RECIPE_API_KEY:'test-only',RECIPE_RATE_LIMITER:{limit:async()=>({success:true})}};
 const result=await handleRecipeRequest(req('?ingredients=chicken&type=Soups'),env,async()=>{called=true;throw Error('must not happen')});
 assert.equal(result.status,422);assert.equal(called,false);
});
