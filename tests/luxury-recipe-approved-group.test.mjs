import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {collectApprovedGroup} from '../ops/recipe-expansion/approved-group.mjs';
import {recipes} from '../luxury-v2/catalog.js';
const read=name=>JSON.parse(readFileSync(new URL('../ops/recipe-expansion/'+name,import.meta.url),'utf8'));
const drafts=read('batch-01-recipe-drafts.json').recipes;
const photos=read('batch-01-photo-manifest.json').recipes;
test('none of the unfinished recipes can be published today',()=>{
 const result=collectApprovedGroup(drafts,photos,recipes);
 assert.equal(result.approved.length,0);assert.deepEqual(result.problems,[]);
});
test('one-sided photo approval always fails closed',()=>{
 const draft={...drafts[0],stage:'photo-approved',photoReady:true,photoReview:'approved',photo:photos[0].expectedAsset};
 const result=collectApprovedGroup([draft],photos,recipes);
 assert.equal(result.approved.length,0);assert.match(result.problems[0].reasons.join(' '),/photo approval/);
});
test('full approval still requires real high-resolution assets',()=>{
 const draft={...drafts[0],stage:'photo-approved',photoReady:true,photoReview:'approved',photo:photos[0].expectedAsset};
 const image={...photos[0],assetSaved:true,photoReview:'approved'};
 const missing=collectApprovedGroup([draft],[image],recipes,{readImage:()=>{throw Error('missing real photo')}});
 assert.equal(missing.approved.length,0);assert.match(missing.problems[0].reasons.join(' '),/missing real photo/);
});
test('photo-approved recipe is publishable only with valid measured instructions and photo',()=>{
 const draft={...drafts[0],stage:'photo-approved',photoReady:true,photoReview:'approved',photo:photos[0].expectedAsset};
 const image={...photos[0],assetSaved:true,photoReview:'approved'};
 const webp=Buffer.alloc(22000);webp.write('RIFF',0);webp.write('WEBPVP8X',8);webp.writeUInt32LE(10,16);webp.writeUIntLE(999,24,3);webp.writeUIntLE(699,27,3);
 const result=collectApprovedGroup([draft],[image],recipes,{readImage:()=>webp});
 assert.equal(result.problems.length,0);assert.equal(result.approved.length,1);assert.equal(result.photos[draft.id],draft.photo);
});
