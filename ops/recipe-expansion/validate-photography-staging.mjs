// Photo-only staging gate. Does not publish recipes or relax nutrition gates.
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {assertPhotoQuality} from './image-quality.mjs';
const root='ops/recipe-expansion/';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const manifest=read(root+'recipe-photo-production-manifest.json');
const drafts=read(root+'batch-01-recipe-drafts.json').recipes;
const reviews=read(root+'photography-visual-reviews.json');
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
assert.equal(manifest.photos.length,110);
assert.equal(new Set(manifest.photos.map(p=>p.recipeId)).size,110);
assert.equal(new Set(manifest.photos.map(p=>p.photoPath)).size,110);
const hashes=new Set();let saved=0,approved=0;
for(const p of manifest.photos){
 const recipe=drafts.find(r=>r.id===p.recipeId);
 assert.equal(p.name,recipe?.name);
 assert.equal(p.photoPath,`assets/recipe-expansion/${p.recipeId}.webp`);
 const review=reviews.photos[p.recipeId];
 if(!fs.existsSync(p.photoPath)){
  assert.equal(p.photoVerified,false,p.recipeId+' claims a missing approved photo');
  assert.ok(!review,p.recipeId+' missing reviewed file');continue;
 }
 saved++;
 const bytes=fs.readFileSync(p.photoPath),hash=digest(bytes);
 const dimensions=assertPhotoQuality(bytes,{minWidth:960,minHeight:640});
 assert.ok(dimensions.bytes<=150*1024,p.recipeId+' exceeds mobile budget');
 assert.ok(!hashes.has(hash),'Duplicate photograph '+p.recipeId);hashes.add(hash);
 assert.ok(review,'File lacks a visual review '+p.recipeId);
 assert.equal(review.sha256,hash,'Photo changed after visual review '+p.recipeId);
 assert.equal(review.recipeSha256,digest(JSON.stringify(recipe)),'Recipe changed after visual review '+p.recipeId);
 assert.equal(review.verdict,'accepted');assert.ok(review.notes.length>30);
 assert.equal(p.photoVerified,true);assert.equal(p.status,'accepted-staging-only');approved++;
}
assert.equal(manifest.ready,approved);
// Verify original catalog, every original local image and all nutrition/recipe
// evidence against the saved nutrition baseline. New photography cannot edit them.
const base=reviews.baselineCommit;
const photographyReports=new Set(['recipe-photo-production-manifest.json','recipe-photo-coverage-audit.json','audit-recipe-expansion-photos.mjs']);
const protectedPaths=execFileSync('git',['ls-tree','-r','--name-only',base,'assets/meal-photos/','index.html','luxury-v2/','ops/recipe-expansion/'],{encoding:'utf8'}).trim().split('\n').filter(p=>!photographyReports.has(p.split('/').at(-1)));
for(const p of protectedPaths){
 const original=execFileSync('git',['show',`${base}:${p}`],{maxBuffer:20*1024*1024});
 assert.ok(fs.existsSync(p),'Removed original '+p);
 assert.equal(digest(fs.readFileSync(p)),digest(original),'Changed protected file '+p);
}
const batch=Number(process.argv.find(a=>a.startsWith('--batch='))?.split('=')[1]||0);
if(batch){
 const begin=(batch-1)*25,end=Math.min(batch*25,110);
 for(const p of manifest.photos.slice(begin,end))assert.equal(p.photoVerified,true,'Incomplete requested batch: '+p.recipeId);
}
if(process.argv.includes('--complete'))assert.equal(approved,110,'All 110 photos must be approved');
console.log(JSON.stringify({target:110,saved,approved,missing:110-saved,duplicateFiles:0,protectedFilesUnchanged:protectedPaths.length,productionReleaseEnabled:false}));
