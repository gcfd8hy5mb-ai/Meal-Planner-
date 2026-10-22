import test from 'node:test';
import assert from 'node:assert/strict';
import {handleRecipeRequest} from '../ops/recipe-search/worker.mjs';
const makeRequest=({ip='198.51.100.21',query='?ingredients=chicken',origin}={})=>new Request('https://tablewise-luxury-preview.pages.dev/api/recipes'+query,{headers:{...(ip?{'CF-Connecting-IP':ip}:{}),...(origin?{Origin:origin}:{})}});
const mockedFetch=async()=>{throw Error('Provider must not be called')};
test('key without configured limiter fails closed, not a provider request',async()=>{
 const r=await handleRecipeRequest(makeRequest(),{RECIPE_API_KEY:'testkey'},mockedFetch);
 assert.equal(r.status,503);assert.match((await r.json()).error,/protection is not configured/);
});
test('limiter denial returns 429 and does not contact provider',async()=>{
 let key;const r=await handleRecipeRequest(makeRequest(),{RECIPE_API_KEY:'testkey',RECIPE_RATE_LIMITER:{limit:async args=>{key=args.key;return {success:false}}}},mockedFetch);
 assert.equal(r.status,429);assert.equal(key,'198.51.100.21');
});
test('limiter failure and absent trusted client IP are fail-closed',async()=>{
 const env={RECIPE_API_KEY:'testkey',RECIPE_RATE_LIMITER:{limit:async()=>{throw Error('rate limiter unavailable')}}};
 assert.equal((await handleRecipeRequest(makeRequest(),env,mockedFetch)).status,503);
 assert.equal((await handleRecipeRequest(makeRequest({ip:null}),env,mockedFetch)).status,503);
});
test('invalid parameters do not consume limiter quota',async()=>{
 let called=false;const env={RECIPE_API_KEY:'testkey',RECIPE_RATE_LIMITER:{limit:async()=>{called=true;return {success:true}}}};
 assert.equal((await handleRecipeRequest(makeRequest({query:'?ingredients=chicken&type=not-a-category'}),env,mockedFetch)).status,400);
 assert.equal(called,false);
});
test('a request with an allowed limiter result can reach provider lookup',async()=>{
 const env={RECIPE_API_KEY:'testkey',RECIPE_RATE_LIMITER:{limit:async()=>({success:true})}};
 const fetcher=async(url)=>({ok:true,json:async()=>url.includes('filter.php')?{meals:[]}:{meals:[]}});
 const r=await handleRecipeRequest(makeRequest(),env,fetcher);
 assert.equal(r.status,200);assert.deepEqual((await r.json()).recipes,[]);
});
