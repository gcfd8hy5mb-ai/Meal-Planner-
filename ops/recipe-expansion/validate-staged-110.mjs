#!/usr/bin/env node
// Run from repository root: node ops/recipe-expansion/validate-staged-110.mjs
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const get=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const drafts=get('ops/recipe-expansion/batch-01-recipe-drafts.json').recipes;
const manifest=get('ops/recipe-expansion/batch-01-photo-manifest.json').recipes;
const errors=[], warnings=[];
const norm=s=>String(s||'').toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]/g,'');
const ids=new Set(),names=new Set();
if(drafts.length!==110)errors.push('Expected exactly 110 staged drafts, found '+drafts.length);
if(manifest.length!==110)errors.push('Expected exactly 110 photo records, found '+manifest.length);
const photos=new Map(manifest.map(p=>[p.id,p]));
for(const [i,r] of drafts.entries()){
 const expected='exp01-'+String(i+1).padStart(3,'0');
 if(r.id!==expected)errors.push('Bad ID/order: '+r.id+' expected '+expected);
 if(ids.has(r.id))errors.push('Repeated ID '+r.id);
 ids.add(r.id);
 if(names.has(norm(r.name)))errors.push('Repeated name '+r.name);
 names.add(norm(r.name));
 if(!r.name||!r.slot||!r.cuisine||!Number.isFinite(r.serv)||r.serv<1)errors.push('Metadata incomplete '+r.id);
 if(!Number.isFinite(r.prepMinutes)||r.prepMinutes<=0||!Number.isFinite(r.cookMinutes)||r.cookMinutes<=0)errors.push('Missing time '+r.id);
 for(const k of ['cal','p','c','f'])if(!Number.isFinite(r[k])||r[k]<0)errors.push('Missing macros '+r.id+': '+k);
 if(!Array.isArray(r.ingredients)||r.ingredients.length<4||r.ingredients.some(x=>!Array.isArray(x)||typeof x[0]!=='string'||!Number.isFinite(x[1])||x[1]<=0||!x[2]))errors.push('Bad ingredients '+r.id);
 if(!Array.isArray(r.steps)||r.steps.length<4||r.steps.some(s=>typeof s!=='string'||s.length<35))errors.push('Insufficient instructions '+r.id);
 if(!r.nutritionStatus?.includes('estimate'))warnings.push('Nutrition status needs review: '+r.id);
 const p=photos.get(r.id);
 if(!p||p.name!==r.name)errors.push('Photo manifest missing/name mismatch '+r.id);
 else {
  if(!p.photoBrief||p.photoBrief.length<25)errors.push('Photo brief missing '+r.id);
  if(p.assetSaved||p.photoReview==='accepted'){
    if(!fs.existsSync(path.join(root,p.expectedAsset)))errors.push('Approved photo file missing '+r.id);
  } else warnings.push('Photo not yet approved: '+r.id);
 }
}
if(manifest.some(p=>!ids.has(p.id)))errors.push('Orphan photo entries found');
console.log(JSON.stringify({recipes:drafts.length,photoRecords:manifest.length,photoAssetsApproved:manifest.filter(p=>p.photoReview==='accepted'&&p.assetSaved).length,errors,warningsCount:warnings.length,warningsSample:warnings.slice(0,15)},null,2));
if(errors.length)process.exitCode=1;
