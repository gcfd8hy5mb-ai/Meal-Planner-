import {ingredientMatches} from './ingredient-match.mjs';
// Local, private matching until a licensed recipe API is connected server-side.
// Do not send pantry contents to a third party without a user-initiated search.
export const foodTypes=['Any','Mexican','Tex-Mex','Italian','Chinese','Asian','Southern','American','Soups','Stews','Casseroles','Breakfast','BBQ','Seafood','Vegetarian'];
const normalize=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const synonyms={tomatoes:'tomato',potatoes:'potato',eggs:'egg',onions:'onion',peppers:'pepper',beans:'bean',noodles:'noodle'};
export function ingredientTokens(text){
 const input=String(text??'').split(/[,;\n]+/).map(normalize).filter(Boolean).slice(0,60);
 return [...new Set(input.map(t=>synonyms[t]||t))];
}
export function matchPantry(recipes,pantry,{type='Any',maxMissing=2}={}){
 const owned=ingredientTokens(Array.isArray(pantry)?pantry.join(','):pantry);
 if(!owned.length)return [];
 const cuisine=normalize(type);
 const typeAliases={soups:['soup','broth'],stews:['stew'],casseroles:['casserole','bake'],mexican:['mexican','taco','burrito','enchilada','fajita'], 'tex mex':['tex mex','taco','quesadilla','fajita'],bbq:['bbq','barbecue','grill'],chinese:['chinese','stir fry'],asian:['asian','chinese','japanese','thai','korean'],american:['american','burger','sandwich'],breakfast:['breakfast','pancake','egg']};
 const allowed=Math.max(0,Math.min(20,Number(maxMissing)||0));
 return (Array.isArray(recipes)?recipes:[]).flatMap(recipe=>{
  const tag=normalize([recipe.name,recipe.cuisine,recipe.group,recipe.category,recipe.slot].join(' '));
  if(cuisine!=='any' && ![cuisine,...(typeAliases[cuisine]||[])].some(t=>tag.includes(t)))return [];
  const needed=[...new Set((recipe.ingredients||[]).map(row=>normalize(row?.[0])).filter(Boolean))];
  if(!needed.length)return [];
  const missing=needed.filter(item=>!owned.some(held=>ingredientMatches(item,held)));
  if(missing.length>allowed)return [];
  return [{recipe,have:needed.length-missing.length,total:needed.length,missing,matchPercent:Math.round(100*(needed.length-missing.length)/needed.length)}];
 }).sort((a,b)=>a.missing.length-b.missing.length||b.matchPercent-a.matchPercent||a.recipe.name.localeCompare(b.recipe.name));
}
