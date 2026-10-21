#!/usr/bin/env node
// Verify editorial juice/garnish splits across all 23 lime recipes.
import fs from 'node:fs';
const recipes=JSON.parse(fs.readFileSync('ops/recipe-expansion/batch-01-recipe-drafts.json','utf8')).recipes;
const known={ 'wedges-only':10,'juice-and-wedges':3,'wedges-and-unspecified-squeeze':1,
  'unspecified-squeeze':1,'whole-lime-juice':7,'juice-with-unspecified-fraction':1 };
const counts={};const wholeJuice=[];
for(const r of recipes){
 const ingredient=r.ingredients.find(i=>i[0]==='Lime');
 const review=r.nutritionIngredientUsage?.Lime;
 if(!ingredient){if(review)throw Error('Orphan lime annotation '+r.name);continue}
 if(!review)throw Error('Missing lime annotation '+r.name);
 if(review.listedQuantity!==ingredient[1]||review.listedUnit!==ingredient[2]||review.consumedAmountGrams!==null)
   throw Error('Unsafe or inconsistent lime annotation '+r.name);
 if(review.usdaJuiceFdcId!==168156||review.usdaJuiceYieldReferenceGramsPerLime!==44)
   throw Error('Missing traceable USDA juice yield '+r.name);
 const type=review.instructionClassification;
 counts[type]=(counts[type]||0)+1;
 const juice=review.explicitWholeLimesJuiced,garnish=review.optionalGarnishLimes;
 if(Number.isFinite(juice)&&(!Number.isInteger(juice)||juice<0||juice>ingredient[1]))
   throw Error('Invalid juiced lime count '+r.name);
 if(Number.isFinite(garnish)&&(!Number.isInteger(garnish)||garnish<0||garnish>ingredient[1]))
   throw Error('Invalid garnish count '+r.name);
 if(Number.isFinite(juice)&&Number.isFinite(garnish)&&juice+garnish>ingredient[1])
   throw Error('Lime portions exceed listed quantity '+r.name);
 if(type==='whole-lime-juice'&&juice!==ingredient[1])throw Error('Incomplete juice yield '+r.name);
 if(type==='wedges-only'&&(juice!==0||garnish!==ingredient[1]))throw Error('Invalid wedge annotation '+r.name);
 if(Number.isFinite(juice)&&juice>0)
   wholeJuice.push({recipe:r.name,recipeId:r.id,juicedLimes:juice,
     referenceJuiceGrams:44*juice,usedAs:'candidate-only',
     note:'USDA average juice yield is not a guaranteed actual amount; no nutrition approved.'});
}
if(Object.entries(known).some(([name,n])=>counts[name]!==n)||Object.values(counts).reduce((a,b)=>a+b,0)!==23)
 throw Error('Lime audit counts drifted: '+JSON.stringify(counts));
const report={recipesAudited:23,classificationCounts:counts,recipesWithExplicitJuiceCounts:wholeJuice.length,
 juiceReferenceCandidates:wholeJuice,verifiedNutrition:0,
 warning:'Reference juice mass is not edible whole-lime mass; optional wedges never count as consumed by default.'};
fs.writeFileSync('ops/recipe-expansion/lime-juice-yield-review.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({recipesAudited:23,counts,juiceReferenceCandidates:wholeJuice.length,verifiedNutrition:0}));
