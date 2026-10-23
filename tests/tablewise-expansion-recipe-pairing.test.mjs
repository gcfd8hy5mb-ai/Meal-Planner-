import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import crypto from 'node:crypto';
const drafts=JSON.parse(fs.readFileSync('release/expansion-110-recipe-drafts.json','utf8')).recipes;
const inventory=JSON.parse(fs.readFileSync('release/expansion-110-photo-inventory.json','utf8')).photos;
test('each staged recipe has its exact approved photograph, with no substitutions',()=>{
 assert.equal(drafts.length,110);assert.equal(inventory.length,110);
 for(const p of inventory){const recipe=drafts.find(x=>x.id===p.recipeId);assert.ok(recipe,p.recipeId);assert.equal(recipe.name,p.name);const image=fs.readFileSync(p.path);assert.equal(crypto.createHash('sha256').update(image).digest('hex'),p.sha256);assert.ok(recipe.ingredients?.length>0&&recipe.steps?.length>=3,p.recipeId);}
});
test('unreleased draft recipes are not silently promoted into app catalog',()=>{
 const catalog=fs.readFileSync('luxury-v2/catalog.js','utf8');
 for(const r of drafts)assert.ok(!catalog.includes('id:\x27'+r.id+'\x27')&&!catalog.includes('\"id\":\"'+r.id+'\"'),r.id+' accidentally released');
});
