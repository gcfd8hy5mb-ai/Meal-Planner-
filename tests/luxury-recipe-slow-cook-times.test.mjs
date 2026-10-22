import assert from 'node:assert/strict';
import test from 'node:test';
import {reviewedRecipeDetails} from '../luxury-v2/recipe-details.mjs';
const longCooks={southMississippiRoast:180,southPotRoast:180,southPulledPork:180,southBbqRibs:150,southBeefStew:120,southCountryRibs:150};
test('long braises and roasting recipes do not show implausibly short cook estimates',()=>{
 for(const [id,minCook] of Object.entries(longCooks)){
  assert.ok(reviewedRecipeDetails[id]?.cookMinutes>=minCook,id+' underestimates its stated cook time');
 }
});

test('buttermilk fried chicken includes its required refrigeration time',()=>{
 assert.ok(reviewedRecipeDetails.southFriedChicken.prepMinutes>=30,'30-minute buttermilk soak cannot fit a shorter prep estimate');
});

test('stew meat soup has enough time for both beef and vegetables',()=>{
 assert.ok(reviewedRecipeDetails.lunchVegBeefSoup.cookMinutes>=85);
});
test('quick bean dishes using cooked or canned beans do not advertise dry-bean cooking times',()=>{
 for(const id of ['southBeansRice','southRedBeans','southBeansCornbread','southBlackEyed']){
  assert.ok(reviewedRecipeDetails[id].cookMinutes<=35,id+' assumes a long dry-bean cook');
 }
});
