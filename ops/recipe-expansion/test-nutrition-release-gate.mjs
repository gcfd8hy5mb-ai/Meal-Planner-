#!/usr/bin/env node
// Regression suite: 102 complete mappings plus eight explicitly estimated recipes; exact release gate stays closed.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
const root='ops/recipe-expansion/';
const source=JSON.parse(fs.readFileSync(root+'ingredient-nutrition-sources.json','utf8')).ingredients;
const recipes=JSON.parse(fs.readFileSync(root+'batch-01-recipe-drafts.json','utf8')).recipes;
const unresolved=['Achiote paste','Beef short ribs','Bone-in chicken thighs','Chicken wings','Chili garlic sauce','Pork baby back ribs','Ranch seasoning'];
assert.equal(Object.keys(source).length,294);
assert.equal(recipes.length,110);
assert.deepEqual(Object.keys(source).filter(k=>source[k].reviewStatus!=='approved').sort(),unresolved.slice().sort());
for(const [name,fraction] of [['Bone-in chicken thighs',0.52],['Chicken wings',0.34]]){
 const item=source[name];
 assert.equal(item.cookedEdibleYieldFraction,fraction,'Official USDA cooked yield expected for '+name);
 assert.ok(item.cookedEdibleYieldSource?.includes('foodbuyingguide.fns.usda.gov'));
 assert.equal(item.reviewStatus,'needs-review','Raw nutrient profiles cannot be approved using cooked edible yields');
 assert.match(item.state,/Raw/i,'Expected raw source nutrient profile; do not silently mix states');
}
// Provisional estimates must NEVER be marked verified.
for(const name of ['Bone-in chicken thighs','Chicken wings','Beef short ribs']){
 const p=source[name].standardCookedEstimate;
 assert.ok(p?.sourceUrl&&p?.kcalPer100g>0&&p?.proteinPer100g>0&&p?.fatPer100g>0,name+' missing sourced cooked estimate');
 assert.equal(source[name].reviewStatus,'needs-review',name+' estimated nutrient values must not be treated as exact');
}
for(const name of ['Achiote paste','Chili garlic sauce']){
 assert.ok(source[name].standardPortionEstimate?.requiredToVerify,name+' missing mass/product validation requirement');
 assert.equal(source[name].reviewStatus,'needs-review');
}
assert.equal(source['Pork baby back ribs'].standardCookedEstimate?.gramsPerUnit,null,'Unknown edible yield must stay null');
assert.ok(source['Ranch seasoning'].labelRoundingBound?.notes,'Ranch small-serving label rounding must be disclosed');
for(const name of unresolved){
 assert.equal(source[name].reviewStatus,'needs-review',name+' must be quarantined until its source/yield is resolved');
}
const run=spawnSync(process.execPath,[root+'calculate-verified-nutrition.mjs'],{encoding:'utf8'});
assert.equal(run.status,0,'the calculator must return a complete estimated report');
const report=JSON.parse(fs.readFileSync(root+'nutrition-calculation-report.json','utf8'));
assert.equal(report.recipes,110);
assert.equal(report.verified,102);
assert.equal(report.estimated,8);
assert.equal(report.blocked,0);
for(const recipe of report.results){
 const original=recipes.find(r=>r.id===recipe.id);
 assert.ok(original,'unknown recipe in report: '+recipe.id);
 const risky=original.ingredients.filter(([name])=>unresolved.includes(name)).map(([name])=>name);
 if(risky.length){
  assert.equal(recipe.verified,false,recipe.name+' unexpectedly verified');
  assert.equal(recipe.estimateOnly,true,recipe.name+' must be labeled estimated');
  assert.equal(recipe.status,'estimated');
  assert.ok(Object.values(recipe.perServing).every(n=>Number.isFinite(n)&&n>=0),recipe.name+' invalid estimated totals');
  for(const name of risky)assert.ok(recipe.estimateWarnings.some(w=>w.ingredient===name&&w.warning),recipe.name+' missing estimation caveat for '+name);
 }else{
  assert.equal(recipe.verified,true,recipe.name+' unexpectedly blocked');
  assert.equal(recipe.estimateOnly,false);
  assert.ok(Object.values(recipe.perServing).every(n=>Number.isFinite(n)&&n>=0),recipe.name+' invalid totals');
 }
}
const gate=spawnSync(process.execPath,[root+'validate-premerge-nutrition.mjs'],{encoding:'utf8'});
assert.equal(gate.status,1,'release validation must reject incomplete ingredient mappings');
const parsed=JSON.parse(gate.stdout);
assert.equal(parsed.ready,102);
assert.equal(parsed.blocked,8);
assert.deepEqual(parsed.errors,[]);
console.log(JSON.stringify({regression:'passed',mappedIngredients:294,approved:287,flagged:7,recipesMapped:102,recipesEstimated:8,releaseGate:'correctly prevents claiming estimates are verified'},null,2));
