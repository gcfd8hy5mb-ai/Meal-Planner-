import assert from 'node:assert/strict';import test from 'node:test';import fs from 'node:fs';
const html=fs.readFileSync('luxury-v2/index.html','utf8');const code=fs.readFileSync('luxury-v2/live.js','utf8');
test('every opened meal shows calories, protein, carbs and fats in the cooking screen',()=>{
 assert.match(html,/id="cookMealMacros"/);
 assert.match(code,/const renderCookMealMacros=/);
 assert.match(code,/\['Calories',currentRecipe\.cal/);
 assert.match(code,/\['Protein',currentRecipe\.p/);
 assert.match(code,/\['Carbs',currentRecipe\.c/);
 assert.match(code,/\['Fats',currentRecipe\.f/);
 assert.match(code,/const showCookStep=\(\)=>\{renderCookMealMacros\(\)/);
 assert.match(code,/const openRecipe=\(recipe\)=>/);
 assert.match(code,/currentRecipe=null;step=0;renderCookMealMacros\(\)/);
 assert.match(code,/Estimated nutrition per serving/);
});
