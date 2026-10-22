#!/usr/bin/env node
// Generate real, recipe-specific image tasks. Does NOT generate images or approve photos.
// node ops/recipe-expansion/export-photo-jobs.mjs [optional-output-file]
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const get=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const recipes=get('ops/recipe-expansion/batch-01-recipe-drafts.json').recipes;
const records=get('ops/recipe-expansion/batch-01-photo-manifest.json').recipes;
if(recipes.length!==110 || records.length!==110)throw Error('Expected 110 recipes and photo briefs');
const byId=new Map(records.map(r=>[r.id,r]));
const jobs=recipes.map((r,i)=>{
 const photo=byId.get(r.id);
 if(!photo || photo.name!==r.name)throw Error('Unpaired photo brief: '+r.id);
 const ingredients=r.ingredients.map(([name,quantity,unit])=>quantity+' '+unit+' '+name).join('; ');
 return {
  id:r.id,recipe:r.name,filename:path.basename(photo.expectedAsset),
  outputPath:photo.expectedAsset,
  status:photo.assetSaved&&photo.photoReview==='accepted'?'approved':'requires-generation-and-review',
  visualPrompt:'Realistic, appetizing NATURAL DAYLIGHT home-cooked food photograph. Dish: '+r.name+'. Photo brief: '+photo.photoBrief+'. Only depict ingredients consistent with recipe; key ingredients: '+ingredients+'. Plate or bowl on natural kitchen surface, inviting true-to-life food textures, no text, no logo, no collages, no wrong protein. Landscape 3:2 framing, minimum 960x640.',
  reviewCriteria:['Full-size individual WebP >= 960x640','Dish and protein match ingredients','All visible garnish consistent with recipe','No lettering or composite crops','Human/editorial visual acceptance required']
 };
});
const target=process.argv[2]||'ops/recipe-expansion/photo-jobs-110.json';
fs.writeFileSync(target,JSON.stringify({generator:'Tablewise recipe photo job export',note:'These are prompts/requirements only, not generated image assets',count:jobs.length,jobs},null,2)+'\n');
console.log('Exported '+jobs.length+' recipe-specific photo jobs to '+target);
