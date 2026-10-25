// Walmart OPD integration is approval-gated. Never fake live availability or cart operations.
export const WALMART_OPD_ENABLED=false;
export const walmartIntegrationStatus=()=>({
 approved:WALMART_OPD_ENABLED,
 message:'Walmart direct cart integration requires Walmart OPD partner API approval. No Walmart account is connected and no items have been added to a Walmart cart.'
});
export function validateWalmartCartRequest({approved,storeId,items}){
 if(!approved)throw Error('Walmart OPD API access is not configured. Cart actions are unavailable.');
 if(!storeId||!Array.isArray(items)||!items.length)throw Error('Choose a Walmart store and matching grocery products.');
 if(items.some(item=>!item?.id||!Number.isInteger(item.quantity)||item.quantity<1))throw Error('Walmart cart items need valid product IDs and quantities.');
 return true;
}
