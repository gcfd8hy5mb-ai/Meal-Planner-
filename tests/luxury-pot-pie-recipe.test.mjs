import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../luxury-v2/catalog.js',import.meta.url),'utf8');
const sandbox={};
vm.runInNewContext(source.replace(/export\s*\{recipes,verifiedRecipePhotos\};?/,'')+'\n;globalThis.__recipes=recipes;',sandbox,{timeout:2000});
test('chicken pot pie gravy thickener is listed and measured',()=>{
 const recipe=Array.from(sandbox.__recipes).find(r=>r.id==='southPotPie');
 assert.ok(recipe,'chicken pot pie exists');
 const flour=recipe.ingredients.find(x=>x[0]==='All-purpose flour');
 assert.equal(flour?.[1],1);assert.equal(flour?.[2],'tbsp');
 assert.ok(recipe.steps.join(' ').includes('flour-and-milk mixture'));
});
