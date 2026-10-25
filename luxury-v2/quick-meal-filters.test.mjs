import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {searchMeals} from './meal-search.mjs';
const recipes=[
{id:'quick',name:'Quick Chicken Bowl',slot:'Dinner',cuisine:'Chicken',p:45,c:20,f:10},
{id:'slow',name:'Slow Chicken Stew',slot:'Dinner',cuisine:'Chicken',p:48,c:15,f:12},
{id:'carby',name:'Quick Noodles',slot:'Dinner',cuisine:'Pasta',p:14,c:67,f:8},
{id:'unknown',name:'Unknown Meal',slot:'Dinner',cuisine:'Chicken'},
{id:'breakfast',name:'Protein Eggs',slot:'Breakfast',p:36,c:8,f:20}
];
const recipeDetails={quick:{prepMinutes:10,cookMinutes:20},slow:{prepMinutes:20,cookMinutes:55},carby:{prepMinutes:8,cookMinutes:10},unknown:{prepMinutes:10,cookMinutes:15},breakfast:{prepMinutes:5,cookMinutes:5}};
test('quick meals use prep plus cook and exclude missing times',()=>{
assert.deepEqual(searchMeals(recipes,{quick:true,recipeDetails}).map(r=>r.id),['quick','carby','unknown']);
assert.equal(searchMeals([{id:'bad',name:'No Time',slot:'Dinner'}],{quick:true,recipeDetails}).length,0)
});
test('protein and carb filters combine with time and category',()=>{
assert.deepEqual(searchMeals(recipes,{quick:true,highProtein:true,lowCarb:true,recipeDetails}).map(r=>r.id),['quick']);
assert.deepEqual(searchMeals(recipes,{category:'Chicken',quick:true,highProtein:true,lowCarb:true,recipeDetails}).map(r=>r.id),['quick']);
assert.deepEqual(searchMeals(recipes,{lowCarb:true,recipeDetails}).map(r=>r.id),['quick','slow']);
});
test('only supported slot appears',()=>assert.deepEqual(searchMeals(recipes,{slot:'Breakfast'}).map(r=>r.id),['breakfast']));
const html=fs.readFileSync('luxury-v2/index.html','utf8'),script=fs.readFileSync('luxury-v2/live.js','utf8');
test('picker actions exist and macro values appear in Today menu',()=>{
 for(const id of ['luxuryQuickOnly','luxuryHighProtein','luxuryLowCarb','luxuryTodayDinnerMacros'])assert.ok(html.includes('id="'+id+'"'),id);
 assert.ok(html.includes('class="optional-macros"'));
 assert.ok(script.includes('setHero=()=>'));
 assert.ok(script.includes("textContent=macroSummary(dinner)"));
 assert.ok(script.includes("macros.textContent=recipe?macroSummary(recipe):''"));
});
test('misleading weekly bulk fill removed, per-day selection and preview guard preserved',()=>{
 assert.ok(!html.includes('luxuryFillWeek'));
 assert.ok(!script.includes('fillWeek'));
 assert.ok(script.includes('replacePreviewMeal(account,previewEdits,week,day,2,recipe.id)'));
 assert.ok(script.includes('const LUXURY_SAVES_RELEASED=true;'));
 assert.ok(script.includes('commitLuxuryPreview({'));
 assert.ok(script.includes('retainBackupUntilVerified:true'));
 assert.ok(script.includes('Save meal changes'));
});
