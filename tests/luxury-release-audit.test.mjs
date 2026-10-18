import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const html=readFileSync(new URL('../luxury-v2/index.html',import.meta.url),'utf8');
const live=readFileSync(new URL('../luxury-v2/live.js',import.meta.url),'utf8');
const catalog=readFileSync(new URL('../luxury-v2/catalog.js',import.meta.url),'utf8');

test('all live direct ID selectors exist in the standalone luxury shell',()=>{
 const htmlIds=[...html.matchAll(/\\bid=["']([^"'<>]+)["']/g)].map(m=>m[1]);
 const referenced=[...live.matchAll(/(?:querySelector|querySelectorAll)\\(\\s*['"]#([A-Za-z][\\w:-]*)['"]\\s*\\)/g)].map(m=>m[1]);
 assert.equal(new Set(htmlIds).size,htmlIds.length,'duplicate element IDs');
 for(const id of referenced)assert.ok(htmlIds.includes(id),'missing interactive element #'+id);
 assert.ok(referenced.length>=75,'test unexpectedly skipped most selectors');
});
test('production cloud-save release gate remains disabled in guarded preview',()=>{
 assert.match(live,/const LUXURY_SAVES_RELEASED=false;/);
 assert.match(live,/if\\(!LUXURY_SAVES_RELEASED\\|\\|luxurySaving/);
});
test('catalog contains 166 unique recipes with instructions and usable photo mappings',()=>{
 const context={};
 vm.runInNewContext(catalog.replace(/export\\s*\\{recipes,verifiedRecipePhotos\\};?/,'')+'\\n;globalThis.__catalog={recipes,verifiedRecipePhotos};',context,{timeout:3000});
 const {recipes,verifiedRecipePhotos}=context.__catalog;
 assert.equal(recipes.length,166);
 assert.equal(new Set(recipes.map(r=>r.id)).size,recipes.length);
 const missing=[];
 for(const recipe of recipes){
  assert.ok(Array.isArray(recipe.ingredients)&&recipe.ingredients.length>0,'missing ingredients: '+recipe.id);
  assert.ok(Array.isArray(recipe.steps)&&recipe.steps.length>=3,'incomplete recipe steps: '+recipe.id);
  const url=verifiedRecipePhotos[recipe.id];
  if(typeof url!=='string'||!url.startsWith('https://'))missing.push(recipe.id);
 }
 assert.deepEqual(missing,[],'missing photo mappings (remote loading still needs device/network verification)');
});
test('Kroger requests remain authenticated and do not replay cart actions after iPhone restore',()=>{
 const gateway=readFileSync(new URL('../luxury-v2/kroger-connect.mjs',import.meta.url),'utf8');
 assert.match(gateway,/getIdToken\\(\\)/);
 assert.match(gateway,/AbortSignal\\.timeout\\(timeoutMs\\)/);
 const resume=live.slice(live.indexOf('const refreshKrogerOnReturn='),live.indexOf('krogerConnectButton.onclick='));
 assert.match(resume,/void refreshKroger\\(\\)/);
 assert.doesNotMatch(resume,/(?:krogerRequest\\([^\\n]*(?:cart\\/add|disconnect|connect))/);
 assert.match(live,/\\+\\+krogerActionEpoch;krogerActionPending=false;clearKrogerProducts/);
});
