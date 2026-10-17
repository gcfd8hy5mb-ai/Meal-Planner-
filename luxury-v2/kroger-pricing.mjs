// Prices are store-dependent API responses, not guaranteed checkout totals or coupon offers.
const money = value => '$'+Number(value).toFixed(2);
const positive = value => typeof value==='number' && Number.isFinite(value) && value>=0;
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
