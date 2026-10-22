import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const html=fs.readFileSync('luxury-v2/index.html','utf8');
const js=fs.readFileSync('luxury-v2/live.js','utf8');
test('calendar has 7 columns and preserves week tabs',()=>{
 for(const id of ['luxuryWeekNutrition','luxuryWeekNutritionAverage','luxuryWeekNutritionTotals','luxuryQuickMealsShortcut','luxuryPantryShortcut','days']) assert.ok(html.includes('id="'+id+'"'),id);
 assert.ok(html.includes('grid-template-columns:repeat(7,minmax(0,1fr))'));
 for(const id of ['data-week="1"','data-week="2"'])assert.ok(html.includes(id));
 assert.ok(js.includes('for(let day=0;day<7;day++)'));
 assert.ok(js.includes("className='calendar-name'"));
});
test('nutrition is computed from currently previewed dinner meals',()=>{
 assert.ok(js.includes('dayMeal(liveWeek,day,2)'));
 assert.ok(js.includes('totals[key]/valid.length'));
 assert.ok(js.includes('totals[k]'));
 assert.ok(js.includes('missing meals excluded'));
 assert.ok(js.includes("document.querySelector('#luxuryWeekNutritionTotals')"));
});
test('quick meals starts filtered picker; existing save gate remains closed',()=>{
 assert.ok(js.includes('initialQuick=false'));
 assert.ok(js.includes('quick=initialQuick'));
 assert.ok(js.includes("openMealPicker(liveWeek,0,{initialQuick:true})"));
 assert.ok(js.includes('const LUXURY_SAVES_RELEASED=false'));
});
