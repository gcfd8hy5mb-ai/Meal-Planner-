import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewedRecipeDetails} from '../luxury-v2/recipe-details.mjs';
test('loaded baked potato recipes time the prepared-potato ingredient, not optional raw baking',()=>{
 for(const id of ['southBbqPotato','lunchLoadedPotato']){
  const details=reviewedRecipeDetails[id];
  assert.ok(details,id+' metadata');
  assert.ok(details.cookMinutes>=5&&details.cookMinutes<=15,id+' should assume pre-baked potato');
  assert.doesNotMatch(details.description,/prepared with familiar ingredients|made with homestyle ingredients/i);
 }
});
