import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewedRecipeDetails} from '../luxury-v2/recipe-details.mjs';
test('final 41 recipe descriptions are individually written and food-specific',()=>{
 const recipes=Object.entries(reviewedRecipeDetails).slice(125,166);
 assert.equal(recipes.length,41);
 const descriptions=recipes.map(([id,data])=>{
  assert.ok(data.description.length>=35,id+' description is too vague');
  assert.doesNotMatch(data.description,/made with homestyle ingredients|prepared with familiar ingredients/i,id+' still generic');
  return data.description;
 });
 assert.equal(new Set(descriptions).size,41);
});
