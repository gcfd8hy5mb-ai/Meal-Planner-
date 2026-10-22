#!/usr/bin/env node
// Ensure editorial proposals match their intended recipe unit and never mark them verified.
import fs from 'node:fs';
const base='ops/recipe-expansion/';
const review=JSON.parse(fs.readFileSync(base+'high-impact-portions-editorial-review.json','utf8'));
const evidence=JSON.parse(fs.readFileSync(base+'high-impact-usda-portion-candidates.json','utf8')).results;
const sources=JSON.parse(fs.readFileSync(base+'ingredient-nutrition-sources.json','utf8')).ingredients;
const recipes=JSON.parse(fs.readFileSync(base+'batch-01-recipe-drafts.json','utf8')).recipes;
const seen=new Set();
let coveredUses=0;
for(const item of review.items){
 const key=JSON.stringify([item.ingredient,item.unit]);
 if(seen.has(key))throw Error('Duplicate editorial ingredient-unit pair '+key);
 seen.add(key);
 const uses=recipes.reduce((n,r)=>n+r.ingredients.filter(i=>i[0]===item.ingredient&&i[2]===item.unit).length,0);
 if(!uses)throw Error('Unused ingredient-unit in review '+key);
 coveredUses+=uses;
 if(!sources[item.ingredient])throw Error('Unknown source ingredient '+item.ingredient);
 if(item.status.startsWith('blocked')){
  if(item.fdcId!==null||item.usdaReferenceGrams!==null)throw Error('Blocked ingredient has proposed USDA conversion: '+item.ingredient);
 }else if(!Number.isInteger(item.fdcId)||!(item.usdaReferenceGrams>0)||!item.portionDefinition){
  throw Error('Incomplete reference evidence for '+item.ingredient);
 }
 if(sources[item.ingredient].reviewStatus==='approved')throw Error('Unexpected approved entry before audit: '+item.ingredient);
 if(!item.status.startsWith('blocked')){
   const raw=evidence.find(e=>e.ingredient===item.ingredient && e.unit===item.unit);
   const food=raw?.candidates?.find(c=>c.fdcId===item.fdcId);
   if(!food)throw Error('Editorial FDC ID not among retrieved USDA foods: '+item.ingredient);
   const portion=food.foodPortions||[];
   const valid=item.ingredient==='Cilantro'
     ?portion.some(p=>p.gramWeight===4&&p.amount===0.25&&/cup/i.test(String(p.modifier)+' '+String(p.measureUnit)))
     :portion.some(p=>p.gramWeight===item.usdaReferenceGrams&&(
       item.ingredient==='Garlic cloves'?/clove/i.test(String(p.modifier)+' '+String(p.portionDescription)):
       item.unit==='tsp'?/tsp|teaspoon/i.test(String(p.modifier)+' '+String(p.measureUnit)):
       item.unit==='tbsp'?/tbsp|tablespoon/i.test(String(p.modifier)+' '+String(p.measureUnit)):
       item.unit==='cup'?/cup/i.test(String(p.modifier)+' '+String(p.measureUnit)):false));
   if(!valid)throw Error('USDA foodPortion weight or unit not supported by source: '+item.ingredient);
 }

}
if(review.items.length!==10||coveredUses!==329||review.approvedMappings!==0)throw Error('Top-ten review totals or approval gate mismatch');
console.log(JSON.stringify({reviewedPairs:review.items.length,recipeUses:coveredUses,withSourceGramCandidates:review.items.filter(x=>x.usdaReferenceGrams!==null).length,blocked:review.items.filter(x=>x.status.startsWith('blocked')).length,approvedMappings:0}));
