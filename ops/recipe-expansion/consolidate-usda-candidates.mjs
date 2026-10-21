#!/usr/bin/env node
// Consolidate 12 USDA review artifacts downloaded to separate directories.
// Usage: node ops/recipe-expansion/consolidate-usda-candidates.mjs /path/to/downloaded-artifacts
// The files are candidate matches, not approved food records or nutritional calculations.
import fs from 'node:fs';
import path from 'node:path';
const dir=process.argv[2];
if(!dir)throw Error('Provide artifact download directory');
const source=JSON.parse(fs.readFileSync('ops/recipe-expansion/ingredient-nutrition-sources.json','utf8'));
const labels=Object.keys(source.ingredients);
const offsets=[0,25,50,75,100,125,150,175,200,225,250,275];
const combined=[];
for(const offset of offsets){
 const file=path.join(dir,'tablewise-usda-api-review-candidates-'+offset,'usda-food-suggestions.json');
 if(!fs.existsSync(file))throw Error('Missing candidate artifact: '+file);
 const data=JSON.parse(fs.readFileSync(file,'utf8'));
 const expected=labels.slice(offset,offset+25);
 if(data.suggestions.length!==expected.length)throw Error('Candidate count mismatch at offset '+offset);
 for(let i=0;i<expected.length;i++){
  const item=data.suggestions[i];
  if(item.ingredient!==expected[i])throw Error('Ingredient order mismatch at offset '+offset+' index '+i);
  if(item.error||!Array.isArray(item.candidates))throw Error('USDA lookup failed: '+item.ingredient);
  combined.push({ingredient:item.ingredient,reviewStatus:'pending',candidates:item.candidates});
 }
}
if(combined.length!==labels.length)throw Error('Incomplete candidate coverage');
const out={source:'USDA FoodData Central search',runArtifactCount:12,ingredients:combined.length,
 note:'All are search candidates, NOT validated food matches, measured portions, or verified nutrition. Food detail lookup, nutrients and gram conversions still required.',reviewItems:combined};
const target='ops/recipe-expansion/usda-candidates-consolidated.json';
fs.writeFileSync(target,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({candidateSearches:combined.length,withCandidateResults:combined.filter(x=>x.candidates.length>0).length,noCandidates:combined.filter(x=>x.candidates.length===0).map(x=>x.ingredient),output:target}));
