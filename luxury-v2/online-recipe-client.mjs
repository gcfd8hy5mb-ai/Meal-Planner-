// User-initiated, same-origin search only. The API key must remain on the server.
export const ONLINE_RECIPE_SEARCH_ENABLED=false;
export async function requestOnlineRecipes({fetcher,ingredients,type='Any',maxMissing=2,endpoint='/api/recipes',signal}={}){
 if(typeof fetcher!=='function')throw new TypeError('fetcher required');
 const items=(Array.isArray(ingredients)?ingredients:[]).map(x=>String(x).trim()).filter(Boolean).slice(0,12);
 if(!items.length)return [];
 const url=new URL(endpoint,'https://tablewise.invalid');
 if(url.origin!=='https://tablewise.invalid'||!url.pathname.startsWith('/api/recipes'))throw Error('Invalid recipe endpoint');
 url.searchParams.set('ingredients',items.join(','));
 url.searchParams.set('type',String(type).slice(0,40));
 url.searchParams.set('maxMissing',String(Math.max(0,Math.min(5,Number(maxMissing)||0))));
 const response=await fetcher(url.pathname+url.search,{method:'GET',credentials:'same-origin',headers:{Accept:'application/json'},signal});
 if(!response.ok)throw Error('Online recipes unavailable right now');
 const data=await response.json();
 if(!Array.isArray(data.recipes))throw Error('Invalid recipe response');
 return data.recipes.slice(0,30).filter(x=>x&&typeof x.name==='string'&&Array.isArray(x.ingredients)&&typeof x.instructions==='string');
}
