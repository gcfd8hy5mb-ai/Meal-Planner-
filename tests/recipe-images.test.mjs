import {readFileSync,existsSync} from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const mapMatch=html.match(/const verifiedRecipePhotos=(\{[^;]+\});const recipePhoto=/);
assert.ok(mapMatch,'Photo mapping must exist');
const photos=JSON.parse(mapMatch[1]);
const entries=Object.entries(photos);
test('Every mapped recipe has a unique safe image path or HTTPS URL',()=>{
  assert.ok(entries.length>0);
  assert.equal(new Set(entries.map(([,url])=>url)).size,entries.length);
  for(const [id,url] of entries){assert.match(id,/^[A-Za-z][A-Za-z0-9]*$/);if(url.startsWith('assets/meal-photos/')){assert.equal(url,'assets/meal-photos/'+id+'.webp');const file=new URL('../'+url,import.meta.url);assert.ok(existsSync(file),'Missing asset '+id);const data=readFileSync(file);assert.equal(data.toString('ascii',0,4),'RIFF');assert.equal(data.toString('ascii',8,12),'WEBP');assert.ok(data.length<150*1024,'Mobile image exceeds 150 KiB: '+id);}else assert.match(url,/^https:\/\/images\.unsplash\.com\/photo-[A-Za-z0-9-]+\?/);}
});
test('Photo components have a safe labeled fallback',()=>{
  assert.match(html,/const recipeVisual=/);
  assert.match(html,/nextElementSibling\.hidden=false/);
});
test('External photo links respond with images',async(t)=>{
  if(process.env.CHECK_IMAGE_URLS!=='1'){t.skip('Set CHECK_IMAGE_URLS=1 to enable network image checks');return;}
  const failures=[];
  for(let i=0;i<entries.length;i+=5){
    await Promise.all(entries.slice(i,i+5).filter(([,url])=>url.startsWith('https://')).map(async([id,url])=>{
      try{const response=await fetch(url,{signal:AbortSignal.timeout(15000),headers:{Range:'bytes=0-1023'}});if(!response.ok||!response.headers.get('content-type')?.startsWith('image/'))failures.push(id+': HTTP '+response.status+' '+response.headers.get('content-type'));await response.body?.cancel();}
      catch(err){failures.push(id+': '+err.message);}
    }));
  }
  assert.deepEqual(failures,[],'Broken or non-image URLs');
});

test('Prompt inventory contains five exact batches of 25 unique catalog recipes',()=>{
  const inventory=JSON.parse(readFileSync(new URL('../docs/meal-photo-prompts/catalog.json',import.meta.url),'utf8'));
  assert.equal(inventory.length,125);
  assert.equal(new Set(inventory.map(r=>r.id)).size,125);
  for(let batch=1;batch<=5;batch++)assert.equal(inventory.filter(r=>r.batch===batch).length,25);
  for(const item of inventory){assert.ok(html.includes('id:'+JSON.stringify(item.id))||html.includes('id:'+"'"+item.id+"'")||html.includes('"id":'+JSON.stringify(item.id)),item.id+' must exist in catalog');assert.equal(item.asset,'assets/meal-photos/'+item.id+'.webp');assert.ok(item.prompt.includes(item.name));for(const [name] of item.ingredients)assert.ok(item.prompt.includes(name),item.id+' missing ingredient '+name);}
});
