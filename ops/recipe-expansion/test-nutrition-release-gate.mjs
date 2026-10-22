#!/usr/bin/env node
// Regression suite for Tablewise staged nutrition. Intentionally leaves 7 flagged foods blocked.
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
for(const name of unresolved){
 assert.equal(source[name].reviewStatus,'needs-review',name+' must be quarantined until its source/yield is resolved');
}
const run=spawnSync(process.execPath,[root+'calculate-verified-nutrition.mjs'],{encoding:'utf8'});
assert.equal(run.status,1,'the calculator must remain a failing release gate with 8 blocked recipes');
const report=JSON.parse(fs.readFileSync(root+'nutrition-calculation-report.json','utf8'));
assert.equal(report.recipes,110);
assert.equal(report.verified,102);
assert.equal(report.blocked,8);
for(const recipe of report.results){
 const original=recipes.find(r=>r.id===recipe.id);
 assert.ok(original,'unknown recipe in report: '+recipe.id);
 const risky=original.ingredients.filter(([name])=>unresolved.includes(name)).map(([name])=>name);
 if(risky.length){
  assert.equal(recipe.verified,false,recipe.name+' unexpectedly verified');
  assert.equal(recipe.perServing,null,recipe.name+' must not show incomplete totals');
  for(const name of risky)assert.ok(recipe.issues.some(issue=>issue.includes(name)),recipe.name+' missing blocker for '+name);
 }else{
  assert.equal(recipe.verified,true,recipe.name+' unexpectedly blocked');
  assert.ok(Object.values(recipe.perServing).every(n=>Number.isFinite(n)&&n>=0),recipe.name+' invalid totals');
 }
}
const gate=spawnSync(process.execPath,[root+'validate-premerge-nutrition.mjs'],{encoding:'utf8'});
assert.equal(gate.status,1,'release validation must reject incomplete ingredient mappings');
const parsed=JSON.parse(gate.stdout);
assert.equal(parsed.ready,102);
assert.equal(parsed.blocked,8);
assert.deepEqual(parsed.errors,[]);
console.log(JSON.stringify({regression:'passed',mappedIngredients:294,approved:287,flagged:7,recipesReady:102,recipesBlocked:8,releaseGate:'correctly blocks merge'},null,2));
