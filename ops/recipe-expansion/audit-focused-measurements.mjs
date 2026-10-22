#!/usr/bin/env node
// Produce real recipe measurement requirements for USDA candidates. Never guess weights.
import fs from 'node:fs';
const root='ops/recipe-expansion/';
const drafts=JSON.parse(fs.readFileSync(root+'batch-01-recipe-drafts.json','utf8')).recipes;
const candidates=JSON.parse(fs.readFileSync(root+'usda-focused-identity-review.json','utf8')).results;
const source=JSON.parse(fs.readFileSync(root+'ingredient-nutrition-sources.json','utf8')).ingredients;
const requirements=[];
for(const candidate of candidates){
 const uses=[];
 for(const recipe of drafts)for(const [name,quantity,unit] of recipe.ingredients){
  if(name===candidate.ingredient)uses.push({recipeId:recipe.id,recipe:recipe.name,quantity,unit});
 }
 const distinctUnits=[...new Set(uses.map(x=>x.unit))];
 const missingUnits=distinctUnits.filter(unit=>!(Number.isFinite(source[candidate.ingredient]?.gramsPerUnit?.[unit])&&source[candidate.ingredient].gramsPerUnit[unit]>0));
 requirements.push({ingredient:candidate.ingredient,foodIdCandidate:candidate.candidateFdcId,identityReview:candidate.status,uses:uses.length,units:distinctUnits,missingGramConversions:missingUnits,recipeUses:uses,readyForNutrition:false});
}
const report={recipesScanned:drafts.length,ingredientsReviewed:requirements.length,totalRecipeUses:requirements.reduce((n,x)=>n+x.uses,0),
 missingConversionKinds:requirements.reduce((n,x)=>n+x.missingGramConversions.length,0),
 note:'Exact recipe units extracted from drafts. Conversion values are intentionally absent until a documented edible-weight source is checked. No nutrition values or food matches are approved.',requirements};
fs.writeFileSync(root+'usda-focused-measurement-review.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({recipesScanned:report.recipesScanned,ingredientsReviewed:report.ingredientsReviewed,totalRecipeUses:report.totalRecipeUses,missingConversionKinds:report.missingConversionKinds}));
if(report.ingredientsReviewed!==12||report.recipesScanned!==110)process.exitCode=1;
