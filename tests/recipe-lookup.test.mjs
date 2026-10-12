import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const from=html.indexOf('const lookupExternalDinner='),to=html.indexOf(';function startMyFoods()',from);
assert.ok(from>=0&&to>from,'recipe lookup exists');
const body=html.slice(from,to);
function makeLookup(meals,seen){const fetch=async url=>{seen.push(url);return {ok:true,json:async()=>({meals})}};return new Function('fetch','setTimeout','clearTimeout',body+';return lookupExternalDinner')(fetch,setTimeout,clearTimeout)}
test('search encodes dish name and parses ingredients',async()=>{
 const seen=[];
 const meal={idMeal:'123',strMeal:'Pepper Chicken',strArea:'Asian',strInstructions:'Cook completely.',strIngredient1:'Chicken',strMeasure1:'1 1/2 pounds',strIngredient2:'Pepper',strMeasure2:'2 each'};
 const result=await makeLookup([meal],seen)('Pepper Chicken');
 assert.match(seen[0],/Pepper%20Chicken/);
 assert.equal(result.recipe.ingredients[0][1],1.5);
 assert.equal(result.recipe.ingredients[1][1],2);
 assert.equal(result.missing.length,0);
 assert.equal(result.recipe.cal,0);
});
test('rejects unrelated matches and handles empty results',async()=>{
 assert.equal(await makeLookup([{strMeal:'Chocolate Cake'}],[])('Chicken Soup'),null);
 assert.equal(await makeLookup([],[])('Unknown dish'),null);
});
test('flags uncertain ingredient quantities instead of inventing amounts',async()=>{
 const result=await makeLookup([{idMeal:'4',strMeal:'Test Stew',strIngredient1:'Salt',strMeasure1:'to taste',strIngredient2:'Beans',strMeasure2:'2 cups'}],[])('Test Stew');
 assert.equal(result.missing.length,1);
 assert.equal(result.recipe.ingredients.length,1);
});
