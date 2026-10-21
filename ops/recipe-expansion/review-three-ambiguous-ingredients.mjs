#!/usr/bin/env node
// Resolve high-impact ambiguities using actual recipe usage and USDA-specific searches.
// Never replace ambiguous lime, onion, or ground-spice portions with guessed weights.
import fs from 'node:fs';
const base='ops/recipe-expansion/';
const recipes=JSON.parse(fs.readFileSync(base+'batch-01-recipe-drafts.json','utf8')).recipes;
const key=process.env.USDA_FDC_API_KEY;
if(!key)throw Error('USDA_FDC_API_KEY missing');
const targets=[
 {ingredient:'Ground cumin',query:'Spices, cumin seed, ground',requireTerms:['cumin'],unit:'tsp'},
 {ingredient:'Yellow onion',query:'Onions, yellow, raw',requireTerms:['onion'],unit:'each'},
 {ingredient:'Lime',query:'Lime juice, raw',requireTerms:['lime','juice'],unit:'each'}
];
const output=[];
for(const target of targets){
 const uses=recipes.filter(r=>r.ingredients.some(i=>i[0]===target.ingredient&&i[2]===target.unit))
   .map(r=>{
    const text=(r.steps||[]).join(' ').toLowerCase();
    let useType='ambiguous';
    if(target.ingredient==='Lime'){
      const wedges=/lime.{0,45}(wedge|cut into wedge)|wedges.{0,30}lime/i.test(text);
      const juice=/juice from.{0,20}lime|lime juice|squeez.{0,35}lime/i.test(text);
      useType=wedges&&juice?'juice-and-wedges':wedges?'wedges-served':juice?'juice-used':'unspecified';
    }else if(target.ingredient==='Yellow onion'){
      useType=/medium yellow onion|medium onion/i.test(text)?'medium-specified':/large onion|large yellow onion/i.test(text)?'large-specified':/small onion|small yellow onion/i.test(text)?'small-specified':'size-unspecified';
    }else if(target.ingredient==='Ground cumin'){
      useType=/marinad.{0,100}cumin|cumin.{0,100}marinad/i.test(text)?'potentially-discarded-in-marinade':'ground-spice-used';
    }
    return {recipeId:r.id,recipe:r.name,amount:r.ingredients.find(i=>i[0]===target.ingredient)[1],unit:target.unit,useType};
   });
 const res=await fetch('https://api.nal.usda.gov/fdc/v1/foods/search?api_key='+encodeURIComponent(key),{
   method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(25000),
   body:JSON.stringify({query:target.query,pageSize:8,dataType:['Foundation','SR Legacy','Survey (FNDDS)']})
 });
 if(!res.ok)throw Error('USDA HTTP '+res.status+' for '+target.ingredient);
 const data=await res.json();
 const matches=(data.foods||[]).filter(f=>target.requireTerms.every(term=>f.description.toLowerCase().includes(term))).slice(0,5);
 const sourceRecords=[];
 for(const match of matches.slice(0,3)){
   const resp=await fetch('https://api.nal.usda.gov/fdc/v1/food/'+match.fdcId+'?api_key='+encodeURIComponent(key),{signal:AbortSignal.timeout(25000)});
   if(!resp.ok)throw Error('USDA food detail HTTP '+resp.status);
   const food=await resp.json();
   sourceRecords.push({fdcId:food.fdcId,description:food.description,dataType:food.dataType,
    foodPortions:(food.foodPortions||[]).map(p=>({amount:p.amount??null,gramWeight:p.gramWeight??null,measureUnit:p.measureUnit?.name??null,modifier:p.modifier??null,portionDescription:p.portionDescription??null}))});
 }
 output.push({ingredient:target.ingredient,query:target.query,uses:uses.length,recipeUses:uses,candidateFoodRecords:sourceRecords,verified:false,reason:'Identity, actual edible amounts, and applicable serving weights require editorial confirmation'});
}
const report={source:'USDA FoodData Central',checked:output.length,totalRecipeUses:output.reduce((a,x)=>a+x.uses,0),approved:0,results:output};
fs.writeFileSync(base+'usda-three-ambiguities-review.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({checked:report.checked,recipeUses:report.totalRecipeUses,records:Object.fromEntries(output.map(x=>[x.ingredient,x.candidateFoodRecords.length])),usage:Object.fromEntries(output.map(x=>[x.ingredient,x.recipeUses.reduce((o,y)=>(o[y.useType]=(o[y.useType]||0)+1,o),{})]))}));
if(output.length!==3)process.exitCode=1;
