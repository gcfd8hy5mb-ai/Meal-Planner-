#!/usr/bin/env node
// Recipe-specific ingredient usage audit. Flags preparation and retention ambiguity;
// source gram weights alone do not authorize nutrition calculations.
import fs from 'node:fs';
const root='ops/recipe-expansion/';
const recipes=JSON.parse(fs.readFileSync(root+'batch-01-recipe-drafts.json','utf8')).recipes;
const review=JSON.parse(fs.readFileSync(root+'high-impact-portions-editorial-review.json','utf8')).items;
const rows=[];
const sourceRetentionPatterns={
 'Olive oil':/marinad|discard|drain|reserve|brush|greas|coat/i,
 'Garlic cloves':/roast|minc|crush|peel|chop|discard/i,
 'Salt':/kosher|sea salt|flaky|salt to taste|drain|marinad|discard/i,
 'Chicken broth':/drain|discard|reserve|reduce|brais|simmer|soup/i,
 'Chili powder':/chile powder|chili blend|chipotle powder|marinad|discard/i,
 'Cilantro':/chopp|garnish|packed|loosely|stems|leaves|sprig/i,
 'Butter':/unsalted|salted|clarified|whipp|drain|discard/i
};
for(const entry of review){
 const uses=recipes.filter(r=>r.ingredients.some(i=>i[0]===entry.ingredient&&i[2]===entry.unit));
 for(const recipe of uses){
  const instructions=(recipe.steps||[]).join(' ');
  const flags=[];
  if(entry.status.startsWith('blocked'))flags.push('food identity or portion blocked');
  if(entry.ingredient==='Salt')flags.push('salt type / crystal size not specified');
  if(entry.ingredient==='Butter')flags.push('salted vs unsalted not specified');
  if(entry.ingredient==='Chicken broth')flags.push('sodium strength and retained liquid may vary');
  if(entry.ingredient==='Cilantro')flags.push('loose vs chopped / packed volume not specified');
  if(entry.ingredient==='Garlic cloves')flags.push('individual clove size variable');
  if(entry.ingredient==='Chili powder')flags.push('spice blend formulation variable');
  if(entry.ingredient==='Olive oil')flags.push('portion retained after cooking may vary');
  const terms=instructions.match(new RegExp(sourceRetentionPatterns[entry.ingredient]?.source||'(?!)','gi'))||[];
  if(/\b(marinad|discard|drain)\b/i.test(instructions)&&['Olive oil','Salt','Chili powder','Chicken broth'].includes(entry.ingredient))
    flags.push('recipe may discard ingredient or cooking liquid; evaluate consumed fraction');
  rows.push({recipeId:recipe.id,recipe:recipe.name,ingredient:entry.ingredient,unit:entry.unit,
    recipeAmount:recipe.ingredients.find(i=>i[0]===entry.ingredient&&i[2]===entry.unit)[1],
    sourcedCandidateGramsPerUnit:entry.usdaReferenceGrams,sourceFoodId:entry.fdcId,
    instructionTerms:[...new Set(terms)].slice(0,12),reviewFlags:[...new Set(flags)],
    status:'recipe-use-review-required'});
 }
}
const result={recipes:recipes.length,ingredientUses:rows.length,sourceItems:review.length,
 note:'Every row requires interpretation of the actual recipe steps; weight references do not establish consumed nutrient amount. No nutrition approvals.',rows};
fs.writeFileSync(root+'high-impact-recipe-usage-audit.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({recipes:result.recipes,ingredientUses:result.ingredientUses,sourceItems:result.sourceItems,flaggedUses:rows.filter(x=>x.reviewFlags.length>0).length,approved:0}));
if(result.recipes!==110||result.ingredientUses!==329||result.sourceItems!==10)process.exitCode=1;
