#!/usr/bin/env node
// Prepare auditable nutrient/portion proposals, never approve or publish them.
import fs from 'node:fs';
const base='ops/recipe-expansion/';
const edited=JSON.parse(fs.readFileSync(base+'high-impact-portions-editorial-review.json','utf8')).items;
const raw=JSON.parse(fs.readFileSync(base+'high-impact-usda-portion-candidates.json','utf8')).results;
const nutrients={calories:[1008,2047,2048],protein:[1003],fat:[1004],carbs:[1005]};
const units={calories:'kcal',protein:'g',fat:'g',carbs:'g'};
const result=[];
for(const item of edited){
 const source=raw.find(x=>x.ingredient===item.ingredient&&x.unit===item.unit);
 const food=source?.candidates?.find(x=>x.fdcId===item.fdcId);
 const macros={},missing=[];
 if(food)for(const [label,ids] of Object.entries(nutrients)){
  const found=ids.map(id=>food.nutrientFacts?.find(n=>n.id===id&&String(n.unit).toLowerCase()===units[label])).find(Boolean);
  if(!found||!Number.isFinite(found.amount)||found.amount<0)missing.push(label);
  else macros[label]={valuePer100g:found.amount,usdaNutrientId:found.id,unit:found.unit};
 }
 else missing.push(...Object.keys(nutrients));
 const issue=[];
 if(item.status.startsWith('blocked'))issue.push(item.reason);
 if(missing.length)issue.push('USDA detail missing nutrient(s): '+missing.join(', '));
 if(item.ingredient==='Olive oil')issue.push('Used in some marinades; edible amount may differ from listed amount');
 if(item.ingredient==='Garlic cloves')issue.push('Clove size varies');
 if(item.ingredient==='Salt')issue.push('Type of salt not specified in recipe');
 if(item.ingredient==='Chicken broth')issue.push('Sodium content and cooking-liquid retention varies');
 if(item.ingredient==='Chili powder')issue.push('Chili powder blends differ');
 if(item.ingredient==='Cilantro')issue.push('Loose/chopped/packed cup not specified');
 if(item.ingredient==='Butter')issue.push('Salted/unsalted and retained fat not always specified');
 result.push({ingredient:item.ingredient,unit:item.unit,fdcId:item.fdcId,
   gramsPerUnitCandidate:item.usdaReferenceGrams,macrosPer100g:macros,
   missingNutrients:missing,issues:issue,readyForApproval:false,
   status:'review-required'});
}
const output={source:'USDA FoodData Central',items:result.length,
 sourcedMacroSets:result.filter(x=>!x.missingNutrients.length).length,
 zeroIssueItems:result.filter(x=>x.issues.length===0).length,
 verifiedMappings:0,note:'Proposals only; no changes to verified ingredient source map or live recipes.',review:result};
fs.writeFileSync(base+'usda-high-impact-macro-proposals.json',JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({items:output.items,sourcedMacroSets:output.sourcedMacroSets,zeroIssueItems:output.zeroIssueItems,verifiedMappings:0,missingByIngredient:result.filter(x=>x.missingNutrients.length).map(x=>({ingredient:x.ingredient,missing:x.missingNutrients}))}));
if(result.length!==10)process.exitCode=1;
