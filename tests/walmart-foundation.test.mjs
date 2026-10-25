import assert from 'node:assert/strict';
import {WALMART_OPD_ENABLED,walmartIntegrationStatus,validateWalmartCartRequest} from '../luxury-v2/walmart-integration.mjs';
assert.equal(WALMART_OPD_ENABLED,false);
assert.equal(walmartIntegrationStatus().approved,false);
assert.match(walmartIntegrationStatus().message,/requires Walmart OPD partner API approval/);
assert.throws(()=>validateWalmartCartRequest({approved:false,storeId:'1',items:[{id:'x',quantity:1}]}),/not configured/);
assert.throws(()=>validateWalmartCartRequest({approved:true,storeId:'1',items:[{id:'x',quantity:0}]}),/valid product IDs/);
assert.equal(validateWalmartCartRequest({approved:true,storeId:'1',items:[{id:'x',quantity:1}]}),true);
console.log('PASS Walmart API access gate and cart input validation');
