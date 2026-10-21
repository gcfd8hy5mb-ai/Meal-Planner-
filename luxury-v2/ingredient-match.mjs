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
 // Match only complete leading ingredient phrases, not interior substrings.
 // "chicken" -> "chicken breast"; "rice" -> "rice noodles".
 return a.startsWith(b+' ')||b.startsWith(a+' ');
}
export function missingIngredientNames(needed,owned){
 const held=(Array.isArray(owned)?owned:[]).map(form).filter(Boolean);
 return (Array.isArray(needed)?needed:[]).filter(x=>!held.some(y=>ingredientMatches(x,y)));
}
