#!/usr/bin/env node
// Document exact mass conversions; never infer cup or whole-food weights.
import fs from 'node:fs';
const root='ops/recipe-expansion/';
const recipes=JSON.parse(fs.readFileSync(root+'batch-01-recipe-drafts.json','utf8')).recipes;
const focus=JSON.parse(fs.readFileSync(root+'usda-focused-identity-review.json','utf8')).results;
const conversions=[];
for(const entry of focus){
 const uses=recipes.flatMap(r=>r.ingredients.filter(i=>i[0]===entry.ingredient).map(i=>({recipe:r.name,quantity:i[1],unit:i[2]})));
 const units=[...new Set(uses.map(u=>u.unit))];
 for(const unit of units){
  // Defined international avoirdupois ounce: exact 28.349523125 grams. Not a fluid ounce.
  const exactMass=unit==='oz';
  conversions.push({ingredient:entry.ingredient,unit,recipeUses:uses.filter(u=>u.unit===unit).length,
    gramsPerUnitProposal:exactMass?28.349523125:null,
    conversionBasis:exactMass?'Exact international avoirdupois ounce (mass)':'Requires documented edible mass for this ingredient, preparation and measurement',
    identityStatus:entry.status,reviewStatus:'pending',notApproved:true});
 }
}
const output={ingredientUnitPairs:conversions.length,exactMassProposals:conversions.filter(x=>x.gramsPerUnitProposal!==null).length,
  unresolvedIngredientSpecificConversions:conversions.filter(x=>x.gramsPerUnitProposal===null).length,
  note:'Conversion proposals do not approve USDA identities, nutrient values or ingredient measurements; no changes to production nutrition.',conversions};
fs.writeFileSync(root+'usda-measurement-proposals.json',JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({ingredientUnitPairs:output.ingredientUnitPairs,exactMassProposals:output.exactMassProposals,unresolved:output.unresolvedIngredientSpecificConversions}));
if(output.ingredientUnitPairs!==12)process.exitCode=1;
