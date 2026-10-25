// Prices are store-dependent API responses, not guaranteed checkout totals or coupon offers.
const money = value => '$'+Number(value).toFixed(2);
const positive = value => typeof value==='number' && Number.isFinite(value) && value>0;
export function krogerPriceSummary(product){
 const regular=product?.regular, promo=product?.promo;
 if(positive(regular)&&positive(promo)&&promo<regular){
  return {onSale:true,savings:regular-promo,label:'Sale '+money(promo)+' (was '+money(regular)+', save '+money(regular-promo)+')'};
 }
 if(positive(regular))return {onSale:false,savings:0,label:'Price '+money(regular)};
 if(positive(promo))return {onSale:false,savings:0,label:'Price '+money(promo)};
 return {onSale:false,savings:0,label:'Price unavailable'};
}
export function sortKrogerOffers(products){
 return [...products].sort((a,b)=>{
  const x=krogerPriceSummary(a),y=krogerPriceSummary(b);
  return Number(y.onSale)-Number(x.onSale)||y.savings-x.savings;
 });
}

export function krogerPromotionCoverage(products){
 const items=Array.isArray(products)?products:[];
 if(!items.length)return 'No Kroger products found for this search.';
 const sales=items.filter(item=>krogerPriceSummary(item).onSale).length;
 return sales?items.length+' matches · '+sales+' verified promotional '+(sales===1?'price':'prices')+' shown. Weekly ads and digital coupons may differ.':items.length+' matches · Kroger returned no discounted promotional prices for these products. Check Kroger weekly ads and digital coupons separately.';
}

const tokens=name=>new Set(String(name||'').toLowerCase().split(/[^a-z0-9]+/).filter(word=>word.length>2));
// Ingredient-use guard: keyword matches are not enough for fresh cooking meat.
const freshMeat=/\b(beef|steak|chicken|pork|turkey|lamb|veal|ground beef|fajita meat|stir.fry meat)\b/i;
const preparedSnack=/\b(jerky|jerkies|air.dried|dried beef|beef sticks?|meat sticks?|snack sticks?|biltong|slim jim|pepperoni|salami|summer sausage|deli meat|lunch meat|ready.to.eat|smoked snack)\b/i;
const petFood=/(?:\b(?:dog|cat|puppy|kitten|pet)\b.{0,35}\b(?:food|treats?|snacks?|chews?|biscuits?)\b|\b(?:food|treats?|snacks?|chews?|biscuits?)\b.{0,35}\b(?:dog|cat|puppy|kitten|pet)\b|\bbeggin['’]?\s*strips\b|\b(?:pedigree|milk-bone|temptations|greenies)\b)/i;
export function krogerIngredientCompatible(ingredient,product){
 const sought=String(ingredient||'');
 const name=String(product?.name||'');
 if(petFood.test(name))return false;
 if(freshMeat.test(sought)&&!preparedSnack.test(sought)&&preparedSnack.test(name))return false;
 return true;
}
export function krogerIngredientRelevance(ingredient,product){
 if(!krogerIngredientCompatible(ingredient,product))return 0;
 const wanted=tokens(ingredient),found=tokens(product?.name);
 return wanted.size?[...wanted].filter(word=>found.has(word)).length/wanted.size:0;
}
export function sortKrogerIngredientMatches(ingredient,products){
 return [...(Array.isArray(products)?products:[])].sort((a,b)=>{
  const relevance=krogerIngredientRelevance(ingredient,b)-krogerIngredientRelevance(ingredient,a);
  if(relevance)return relevance;
  const x=krogerPriceSummary(a),y=krogerPriceSummary(b);
  return Number(y.onSale)-Number(x.onSale)||y.savings-x.savings;
 });
}
