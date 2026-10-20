import test from 'node:test';import assert from 'node:assert/strict';
import {handleRecipeRequest} from '../ops/recipe-search/worker.mjs';
import {requestOnlineRecipes,ONLINE_RECIPE_SEARCH_ENABLED} from '../luxury-v2/online-recipe-client.mjs';
const request=(query='',headers={})=>new Request('https://tablewise-luxury-preview.pages.dev/api/recipes'+query,{headers});
test('online discovery remains disabled pending private provider key',()=>assert.equal(ONLINE_RECIPE_SEARCH_ENABLED,false));
test('no secret means no provider request',async()=>{
 let called=false;const r=await handleRecipeRequest(request('?ingredients=rice'),{},async()=>{called=true;throw Error('unexpected')});assert.equal(r.status,503);assert.equal(called,false);
});
test('rejects wrong origin, missing ingredients, and invalid cuisine',async()=>{
 const env={RECIPE_API_KEY:'test-only'};
 assert.equal((await handleRecipeRequest(request('?ingredients=rice',{Origin:'https://evil.example'}),env)).status,403);
 assert.equal((await handleRecipeRequest(request('?type=Mexican'),env)).status,400);
 assert.equal((await handleRecipeRequest(request('?ingredients=rice&type=Unknown'),env)).status,400);
});
test('client only calls its own recipe endpoint with bounded filters',async()=>{
 let url;const result=await requestOnlineRecipes({fetcher:async u=>{url=u;return {ok:true,json:async()=>({recipes:[]})}},ingredients:['Chicken','Rice'],type:'Mexican',maxMissing:9});
 assert.deepEqual(result,[]);assert.match(url,/^\/api\/recipes\?/);assert.match(url,/maxMissing=5/);
});
