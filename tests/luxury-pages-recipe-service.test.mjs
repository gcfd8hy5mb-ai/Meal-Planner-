import test from 'node:test';import assert from 'node:assert/strict';
import {onRequest} from '../functions/api/recipes.js';
const request=(path='/api/recipes?ingredients=chicken',init={})=>new Request('https://tablewise-luxury-preview.pages.dev'+path,init);
test('fail closed if private recipe service is missing',async()=>{const r=await onRequest({request:request(),env:{}});assert.equal(r.status,503)});
test('Pages proxy forwards only expected query and safe headers',async()=>{
 let destination,upstream;const env={TABLEWISE_RECIPE_SERVICE:{fetch:async r=>{destination=new URL(r.url);upstream=r;return Response.json({recipes:[]})}}};
 const r=await onRequest({request:request('/api/recipes?ingredients=chicken',{headers:{'CF-Connecting-IP':'192.0.2.1','X-Attacker-Header':'secret'}}),env});
 assert.equal(r.status,200);assert.equal(destination.hostname,'tablewise-recipe-search.internal');assert.equal(destination.pathname,'/api/recipes');
 assert.equal(upstream.headers.get('X-Attacker-Header'),null);assert.equal(upstream.headers.get('CF-Connecting-IP'),'192.0.2.1');
});
test('service fetch errors, incorrect paths and write attempts fail safely',async()=>{
 const env={TABLEWISE_RECIPE_SERVICE:{fetch:async()=>{throw Error('offline')}}};
 assert.equal((await onRequest({request:request(),env})).status,503);
 assert.equal((await onRequest({request:request('/something-else'),env})).status,404);
 assert.equal((await onRequest({request:request('/api/recipes',{method:'POST'}),env})).status,405);
});
