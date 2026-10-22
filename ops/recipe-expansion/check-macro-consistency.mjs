#!/usr/bin/env node
// Non-destructive screening of rough macros. Does NOT verify nutrition against a food database.
// Usage: node ops/recipe-expansion/check-macro-consistency.mjs
import fs from 'node:fs';
const recipes=JSON.parse(fs.readFileSync('ops/recipe-expansion/batch-01-recipe-drafts.json','utf8')).recipes;
const flagged=[];
for(const r of recipes){
 const expected=4*r.p+4*r.c+9*r.f;
 const delta=Math.round(r.cal-expected);
 const pct=Math.round(100*Math.abs(delta)/Math.max(1,r.cal));
 if(pct>15 || Math.abs(delta)>150)flagged.push({id:r.id,name:r.name,listedCalories:r.cal,macroCalories:expected,difference:delta,percent:pct});
}
console.log(JSON.stringify({count:recipes.length,flagged:flagged.length,flaggedRecipes:flagged,note:'Macro calorie check only: 4 kcal/g protein and carbohydrate, 9 kcal/g fat. Fiber, rounding, and label conventions may differ. All values are provisional until ingredient quantities, yields and database references are validated.'},null,2));
if(flagged.length)process.exitCode=1;
