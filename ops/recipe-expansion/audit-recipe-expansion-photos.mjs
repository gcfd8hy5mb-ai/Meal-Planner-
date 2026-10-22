#!/usr/bin/env node
// Photo inventory and source-mapping checks. A prompt does not count as an image.
import fs from 'node:fs';
import crypto from 'node:crypto';
import {assertPhotoQuality} from './image-quality.mjs';
const root='ops/recipe-expansion/';
const recipes=JSON.parse(fs.readFileSync(root+'batch-01-recipe-drafts.json','utf8')).recipes;
const manifest=JSON.parse(fs.readFileSync(root+'recipe-photo-production-manifest.json','utf8'));
const reviews=fs.existsSync(root+'photography-visual-reviews.json')?JSON.parse(fs.readFileSync(root+'photography-visual-reviews.json','utf8')).photos:{};
const digest=value=>crypto.createHash('sha256').update(value).digest('hex');
if(recipes.length!==110||manifest.photos.length!==110)throw Error('Expected 110 recipes and photograph briefs');
const ids=new Set(),paths=new Set(),hashes=new Set();
let found=0,duplicates=0;
const rows=[];
for(const p of manifest.photos){
 const r=recipes.find(r=>r.id===p.recipeId);
 if(!r||r.name!==p.name)throw Error('Photo recipe identity mismatch: '+p.recipeId);
 if(ids.has(p.recipeId)||paths.has(p.photoPath))throw Error('Duplicate photo mapping for '+p.recipeId);
 ids.add(p.recipeId);paths.add(p.photoPath);
 if(!p.generationBrief.includes(r.name)||p.requiredVisibleIngredients.length<1)throw Error('Missing recipe-specific visual brief '+p.name);
 if(!p.photoPath.startsWith('assets/recipe-expansion/')||!p.photoPath.endsWith('.webp'))throw Error('Unsafe photo path '+p.photoPath);
 const exists=fs.existsSync(p.photoPath);
 let valid=false,visualMatchReviewed=false,reason='missing photo file';
 if(exists){
  const bytes=fs.readFileSync(p.photoPath);
  try{assertPhotoQuality(bytes,{minWidth:960,minHeight:640});valid=bytes.length<=150*1024}catch{valid=false}
  reason=valid?'needs visual match review':'invalid WebP or suspiciously small file';
  if(valid){
   const hash=crypto.createHash('sha256').update(bytes).digest('hex');
   if(hashes.has(hash)){duplicates++;valid=false;reason='duplicate image bytes'}
   hashes.add(hash);
   const review=reviews[p.recipeId];
   visualMatchReviewed=valid&&review?.verdict==='accepted'&&review.sha256===hash&&review.recipeSha256===digest(JSON.stringify(r))&&review.notes?.length>30;
   if(visualMatchReviewed)reason='accepted for photography staging; production release remains separate';
  }
 }
 if(valid)found++;
 if(r.photoReady===true&&!valid)throw Error('Recipe incorrectly marked photoReady '+r.id);
 if(p.photoVerified===true&&!visualMatchReviewed)throw Error('Photo approval lacks matching image/recipe review hashes '+p.recipeId);
 rows.push({recipeId:p.recipeId,recipe:p.name,path:p.photoPath,filePresent:exists,binaryValid:valid,visualMatchReviewed,ready:valid&&visualMatchReviewed,reason});
}
const visualMatchesApproved=rows.filter(x=>x.visualMatchReviewed).length;
const complete=found===110&&visualMatchesApproved===110&&duplicates===0;
const report={recipes:recipes.length,briefs:manifest.photos.length,binaryPresent:rows.filter(x=>x.filePresent).length,validFiles:found,duplicateFiles:duplicates,visualMatchesApproved,complete,productionReleaseEnabled:false,missing:rows.filter(x=>!x.binaryValid).length,photos:rows};
fs.writeFileSync(root+'recipe-photo-coverage-audit.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({recipes:report.recipes,briefs:report.briefs,binaryPresent:report.binaryPresent,validFiles:found,duplicateFiles:duplicates,visualMatchesApproved,missing:report.missing,ready:complete,productionReleaseEnabled:false}));
if(duplicates||process.argv.includes('--complete')&&!complete)process.exitCode=1;
