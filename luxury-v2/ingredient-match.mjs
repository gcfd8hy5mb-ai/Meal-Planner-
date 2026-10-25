// Shared pantry-matching primitives for local and optional online recipes.
// Avoid substring guesses ("ham" in "champagne", "rice" in "licorice").
const normalize=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
const aliases=new Map(Object.entries({tomatoes:'tomato',potatoes:'potato',eggs:'egg',onions:'onion',peppers:'pepper',beans:'bean',noodles:'noodle',tortillas:'tortilla',carrots:'carrot',chickpeas:'chickpea',scallions:'green onion'}));
export const canonicalIngredient=value=>{
 let text=normalize(value);
 text=text.split(' ').map(token=>aliases.get(token)||token).join(' ');
 return text;
};
const form=canonicalIngredient;
export function ingredientMatches(needed,owned){
 const a=form(needed),b=form(owned);
 if(!a||!b)return false;
 if(a===b)return true;
 // Only known varieties/cuts; "rice" is not "rice noodles".
 const variants=new Set(["chicken","beef","pork","tomato","potato","onion","pepper"]);
 const matchesCut=(whole,root)=>variants.has(root)&&whole.startsWith(root+" ");
 return matchesCut(a,b)||matchesCut(b,a);
}
export function missingIngredientNames(needed,owned){
 const held=(Array.isArray(owned)?owned:[]).map(form).filter(Boolean);
 return (Array.isArray(needed)?needed:[]).filter(x=>!held.some(y=>ingredientMatches(x,y)));
}
