import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const manifest=JSON.parse(readFileSync(new URL('../release/expansion-110-photo-inventory.json',import.meta.url),'utf8'));
test('110 approved source photo mappings are unique and complete',()=>{
 assert.equal(manifest.photos.length,110);
 assert.equal(new Set(manifest.photos.map(p=>p.recipeId)).size,110);
 assert.equal(new Set(manifest.photos.map(p=>p.path)).size,110);
 assert.equal(new Set(manifest.photos.map(p=>p.sha256)).size,110);
 for(let i=0;i<110;i++){
  const p=manifest.photos[i],id='exp01-'+String(i+1).padStart(3,'0');
  assert.equal(p.recipeId,id);
  assert.equal(p.path,'assets/recipe-expansion/'+id+'.webp');
  assert.match(p.sha256,/^[a-f0-9]{64}$/);
  assert.equal(p.status,'accepted-staging-only');
 }
});
test('source photos remain staged and cannot be falsely advertised as bundled',()=>{
 assert.equal(manifest.sourceBranch,'photos/expansion-110-staging-20261022');
 assert.ok(manifest.sourceBaseline);
});
