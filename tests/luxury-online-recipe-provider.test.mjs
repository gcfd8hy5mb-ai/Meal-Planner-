import test from 'node:test';import assert from 'node:assert/strict';
import {createMealDbProvider,normalizeRemoteMeal,rankRemoteMeals} from '../luxury-v2/online-recipe-provider.mjs';
const recipe={idMeal:'52701',strMeal:'Chicken Taco',strArea:'Mexican',strCategory:'Chicken',strInstructions:'Cook the chicken and assemble the tacos.',strIngredient1:'Chicken',strMeasure1:'1 lb',strIngredient2:'Tortilla',strMeasure2:'4',strIngredient3:'Cheese',strMeasure3:'1 cup'};
const mock=async url=>({ok:true,json:async()=>url.includes('lookup.php')?{meals:[recipe]}:{meals:[{idMeal:'52701'}]}});
test('normalizes recipe ingredients, quantities and full steps',()=>{const item=normalizeRemoteMeal(recipe);assert.equal(item.ingredients.length,3);assert.equal(item.ingredients[0].amount,'1 lb');assert.match(item.instructions,/Cook the chicken/);});
test('queries cuisine and fetches complete recipes without exposing credentials',async()=>{
 const calls=[];const provider=createMealDbProvider({fetcher:async url=>{calls.push(url);return mock(url)},apiKey:'1'});
 const results=await provider.search({ingredients:['chicken','cheese'],type:'Mexican',maxMissing:1});
 assert.equal(results.length,1);assert.deepEqual(results[0].missing,['Tortilla']);
 assert.ok(calls[0].includes('filter.php?a=Mexican'));assert.ok(calls[1].includes('lookup.php?i=52701'));
});
test('does not offer meals exceeding missing ingredient preference',async()=>{
 const provider=createMealDbProvider({fetcher:mock,apiKey:'1'});
 assert.equal((await provider.search({ingredients:['Chicken'],type:'Mexican',maxMissing:1})).length,0);
});
test('bounds requests and handles empty pantry safely',async()=>{
 let calls=0;const provider=createMealDbProvider({fetcher:async url=>{calls++;return mock(url)},apiKey:'1'});
 assert.deepEqual(await provider.search({ingredients:[]}),[]);assert.equal(calls,0);
});
test('supports exact ingredient ranking and refuses malformed id',()=>{
 assert.equal(normalizeRemoteMeal({idMeal:'1<script>'}),null);
 const result=rankRemoteMeals([normalizeRemoteMeal(recipe)],['Chicken','Tortilla','Cheese'],{maxMissing:0});assert.equal(result.length,1);
});
