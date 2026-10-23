// Safely extract only independently verified recipes for a future incremental merge.
// Pure validation deliberately fails closed: creating a draft never makes it publishable.
import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {assertPhotoQuality} from './image-quality.mjs';
export const root=resolve(fileURLToPath(new URL('../..',import.meta.url)));
const prohibited=/\b(tofu|tempeh|seitan|soy curls|textured vegetable protein|plant-based meat substitute|vegan meat substitute)\b/i;
export function collectApprovedGroup(drafts,manifest,existing,{readImage}={}){
 const problems=[],approved=[],photos={};
 const existingIds=new Set(existing.map(r=>r.id)),existingNames=new Set(existing.map(r=>String(r.name).toLowerCase()));
 const photoIndex=new Map(manifest.map(x=>[x.id,x]));
 const load=readImage||((path)=>{const full=resolve(root,path);if(!existsSync(full))throw Error('photo missing in repository');return readFileSync(full)});
 const seen=new Set();
 for(const recipe of drafts){
  const img=photoIndex.get(recipe.id);
  const intended=Boolean(recipe.photoReady||recipe.photoReview==='approved'||img?.assetSaved||img?.photoReview==='approved');
  if(!intended)continue;
  const reason=[];
  if(seen.has(recipe.id)||existingIds.has(recipe.id)||existingNames.has(String(recipe.name).toLowerCase()))reason.push('duplicate recipe');
  seen.add(recipe.id);
  if(!img||img.name!==recipe.name||img.id!==recipe.id)reason.push('photo manifest mismatch');
  if(recipe.stage!=='photo-approved'||recipe.ingredientsReady!==true||recipe.instructionsReady!==true)reason.push('incomplete editorial approval');
  if(!Array.isArray(recipe.ingredients)||recipe.ingredients.length<3||recipe.ingredients.some(row=>!Array.isArray(row)||!row[0]||!(Number(row[1])>0)||!row[2]))reason.push('unmeasured ingredients');
  if(!Array.isArray(recipe.steps)||recipe.steps.length<4||recipe.steps.some(step=>typeof step!=='string'||step.length<25))reason.push('incomplete instructions');
  if(prohibited.test([recipe.name,...(recipe.ingredients||[]).map(x=>x?.[0])].join(' ')))reason.push('excluded food');
  if(!img?.assetSaved||img.photoReview!=='approved'||recipe.photoReview!=='approved'||recipe.photoReady!==true||recipe.photo!==img.expectedAsset)reason.push('missing paired photo approval');
  if(img?.expectedAsset!==`assets/meal-photos/${recipe.id}.webp`)reason.push('unexpected image path');
  if(!reason.length)try{assertPhotoQuality(load(img.expectedAsset))}catch(e){reason.push(e.message)}
  if(reason.length){problems.push({id:recipe.id,reasons:reason});continue}
  const {photoReady,photoReview,ingredientsReady,instructionsReady,stage,source,...published}=recipe;
  approved.push(published);photos[recipe.id]=img.expectedAsset;
 }
 return {approved,photos,problems};
}
