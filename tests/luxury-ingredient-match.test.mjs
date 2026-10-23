import test from 'node:test';import assert from 'node:assert/strict';
import {ingredientMatches,missingIngredientNames} from '../luxury-v2/ingredient-match.mjs';
import {matchPantry} from '../luxury-v2/pantry-discovery.mjs';
import {rankRemoteMeals} from '../luxury-v2/online-recipe-provider.mjs';
test('ingredient matching handles names and known cuts but never accidental substrings',()=>{
 for(const [needed,owned] of [['Tomatoes','tomato'],['chicken breast','chicken'],['Chicken','CHICKEN breast']])assert.equal(ingredientMatches(needed,owned),true);
 for(const [needed,owned] of [['champagne','ham'],['licorice','rice'],['rice noodles','rice'],['butter','peanut butter'],['fish sauce','fish']])assert.equal(ingredientMatches(needed,owned),false);
});
test('both recipe sources treat similar names as genuinely missing',()=>{
 const local=matchPantry([{name:'Rice noodle bowl',cuisine:'Asian',ingredients:[['Rice noodles',1,'pack'],['Chicken',1,'lb']]}],'rice,chicken',{maxMissing:1});
 assert.deepEqual(local[0].missing,['rice noodles']);
 const remote=rankRemoteMeals([{name:'Rice noodle bowl',ingredients:[{name:'Rice noodles'},{name:'Chicken'}]}],['rice','chicken'],{maxMissing:1});
 assert.deepEqual(remote[0].missing,['Rice noodles']);
 assert.deepEqual(missingIngredientNames(['Ham','Rice noodles'],['champagne','rice']),['Ham','Rice noodles']);
});
