import {ingredientMatches} from './ingredient-match.mjs';
// Development adapter for TheMealDB. Not activated for production.
// The fetcher and API key are injected: never hardcode production credentials in client files.
const clean=value=>String(value??'').trim().toLowerCase().replace(/[^a-z0-9 ]/g,'').replace(/\s+/g,' ');
const ingredientName=value=>clean(value).replace(/\s+/g,'_');
export const supportedAreas={Mexican:'Mexican',Italian:'Italian',Chinese:'Chinese',American:'American',French:'French',Indian:'Indian',Thai:'Thai',Japanese:'Japanese',Greek:'Greek'};
export const supportedCategories={Seafood:'Seafood',Vegetarian:'Vegetarian',Breakfast:'Breakfast',Pasta:'Pasta',Chicken:'Chicken',Beef:'Beef',Pork:'Pork',Vegan:'Vegan',Starter:'Starter',Dessert:'Dessert',Side:'Side',Miscellaneous:'Miscellaneous'};
export function normalizeRemoteMeal(raw){
 if(!raw||typeof raw!=='object'||!/^\d+$/.test(String(raw.idMeal??'')))return null;
 const ingredients=[];
 for(let i=1;i<=20;i++){
  const name=String(raw['strIngredient'+i]??'').trim();
  const amount=String(raw['strMeasure'+i]??'').trim();
  if(name)ingredients.push({name,amount});
 }
 const instructions=String(raw.strInstructions??'').trim();
 return {
  id:String(raw.idMeal),name:String(raw.strMeal??'').trim(),image:String(raw.strMealThumb??'').trim(),
  area:String(raw.strArea??'').trim(),category:String(raw.strCategory??'').trim(),
  sourceUrl:String(raw.strSource??'').trim(),ingredients,instructions,
  attribution:'TheMealDB'
 };
}
export function rankRemoteMeals(meals,pantry,{maxMissing=2}={}){
 const owned=[...new Set((Array.isArray(pantry)?pantry:[]).map(clean).filter(Boolean))];
 const allowed=Math.max(0,Math.min(20,Number(maxMissing)||0));
 return (Array.isArray(meals)?meals:[]).filter(Boolean).map(recipe=>{
  const missing=recipe.ingredients.filter(({name})=>{
   const item=clean(name);
   return !owned.some(have=>ingredientMatches(item,have));
  });
  return {...recipe,missing:missing.map(x=>x.name),have:recipe.ingredients.length-missing.length};
 }).filter(x=>x.missing.length<=allowed).sort((a,b)=>a.missing.length-b.missing.length||b.have-a.have||a.name.localeCompare(b.name));
}
export function createMealDbProvider({fetcher,apiKey,apiVersion='v1',baseUrl='https://www.themealdb.com/api/json'}={}){
 if(typeof fetcher!=='function')throw new TypeError('A fetch implementation is required');
 if(!/^[a-zA-Z0-9_-]{1,100}$/.test(apiKey||''))throw Error('Provider key is required');
 if(!['v1','v2'].includes(apiVersion))throw Error('Unsupported API version');
 const endpoint=baseUrl+'/'+apiVersion+'/'+encodeURIComponent(apiKey)+'/';
 async function get(path,parameter,value){
  const url=endpoint+path+'?'+parameter+'='+encodeURIComponent(value);
  const response=await fetcher(url,{method:'GET',headers:{Accept:'application/json'}});
  if(!response.ok)throw Error('Recipe provider request failed ('+response.status+')');
  const result=await response.json();
  return Array.isArray(result.meals)?result.meals:[];
 }
 return {
  async search({ingredients=[],type='Any',maxMissing=2,maxResults=30}={}){
   const pantry=[...new Set(ingredients.map(clean).filter(Boolean))].slice(0,12);
   if(!pantry.length)return [];
   const area=supportedAreas[type],category=supportedCategories[type];
   // Public V1 allows a single ingredient per filter. Keep requests bounded,
   // intersect candidates via the local pantry ranking after full lookup.
   let summaries;
   if(area)summaries=await get('filter.php','a',area);
   else if(category)summaries=await get('filter.php','c',category);
   else summaries=await get('filter.php','i',ingredientName(pantry[0]));
   const limit=Math.min(30,Math.max(1,Number(maxResults)||20));
   const results=[];
   for(const item of summaries.slice(0,limit)){
    if(!/^\d+$/.test(String(item.idMeal??'')))continue;
    const details=await get('lookup.php','i',String(item.idMeal));
    const parsed=normalizeRemoteMeal(details[0]);
    if(parsed)results.push(parsed);
   }
   return rankRemoteMeals(results,pantry,{maxMissing});
  }
 };
}
