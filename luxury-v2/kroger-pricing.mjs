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
