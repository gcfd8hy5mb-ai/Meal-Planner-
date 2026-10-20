import test from 'node:test';import assert from 'node:assert/strict';
import {onRequestGet,onRequest} from '../functions/api/recipes.js';
const context={request:new Request('https://tablewise-luxury-preview.pages.dev/api/recipes?ingredients=chicken'),env:{}};
test('Cloudflare Pages mounts the gateway without writing to the Kroger Worker',async()=>{
 const result=await onRequestGet(context);
 assert.equal(result.status,503);
 assert.match((await result.json()).error,/not configured/);
});
test('route rejects modifications and never reaches a provider without credentials',async()=>{
 const result=await onRequest({...context,request:new Request('https://tablewise-luxury-preview.pages.dev/api/recipes',{method:'POST'})});
 assert.equal(result.status,405);
});
