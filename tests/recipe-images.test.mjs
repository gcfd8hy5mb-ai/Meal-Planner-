import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const mapMatch=html.match(/const verifiedRecipePhotos=(\{[^;]+\});const recipePhoto=/);
assert.ok(mapMatch,'Photo mapping must exist');
const photos=JSON.parse(mapMatch[1]);
const entries=Object.entries(photos);
test('Every mapped recipe has a unique HTTPS image URL',()=>{
  assert.ok(entries.length>0);
  assert.equal(new Set(entries.map(([,url])=>url)).size,entries.length);
  for(const [id,url] of entries){assert.match(id,/^[A-Za-z][A-Za-z0-9]*$/);assert.match(url,/^https:\/\/images\.unsplash\.com\/photo-[A-Za-z0-9-]+\?/);}
});
test('Photo components have a safe labeled fallback',()=>{
  assert.match(html,/const recipeVisual=/);
  assert.match(html,/nextElementSibling\.hidden=false/);
});
test('External photo links respond with images',async(t)=>{
  if(process.env.CHECK_IMAGE_URLS!=='1'){t.skip('Set CHECK_IMAGE_URLS=1 to enable network image checks');return;}
  const failures=[];
  for(let i=0;i<entries.length;i+=5){
    await Promise.all(entries.slice(i,i+5).map(async([id,url])=>{
      try{const response=await fetch(url,{signal:AbortSignal.timeout(15000),headers:{Range:'bytes=0-1023'}});if(!response.ok||!response.headers.get('content-type')?.startsWith('image/'))failures.push(id+': HTTP '+response.status+' '+response.headers.get('content-type'));await response.body?.cancel();}
      catch(err){failures.push(id+': '+err.message);}
    }));
  }
  assert.deepEqual(failures,[],'Broken or non-image URLs');
});
