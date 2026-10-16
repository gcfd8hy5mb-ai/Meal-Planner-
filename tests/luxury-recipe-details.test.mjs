import test from 'node:test';import assert from 'node:assert/strict';import {recipeSummary,reviewedRecipeDetails} from '../luxury-v2/recipe-details.mjs';
test('uses specific metadata and verified prep/cook time',()=>{assert.deepEqual(recipeSummary({description:'Hearty tacos',prepMinutes:12,cookMinutes:18}),{description:'Hearty tacos.',time:'Prep 12 min · Cook 18 min'});});
test('provides a readable ingredient summary without fabricating timings',()=>{const x=recipeSummary({ingredients:[['Beef',1,'lb'],['Corn tortillas',3,'each'],['Onion',1,'each']]});assert.match(x.description,/Beef, corn tortillas and onion/);assert.match(x.time,/being reviewed/);});
test('does not overwrite known times with estimates',()=>{assert.equal(recipeSummary({prepMinutes:5}).time,'Prep 5 min');});

test('reviewed foundation batch includes 42 explicit recipe metadata records',()=>{assert.equal(Object.keys(reviewedRecipeDetails).length,42);for(const [id,detail] of Object.entries(reviewedRecipeDetails)){assert.ok(detail.description.length>15,id);assert.ok(detail.prepMinutes>0,id);assert.ok(detail.cookMinutes>=0,id);assert.match(recipeSummary({id}).time,/Approx\. Prep/);}});
