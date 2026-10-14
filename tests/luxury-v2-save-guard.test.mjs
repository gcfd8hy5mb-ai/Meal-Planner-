import assert from 'node:assert/strict';
import {checkPlanConflict,preparePlanPatch} from '../luxury-v2/save-guard.mjs';
import {previewAccount} from '../luxury-v2/meal-preview.mjs';
const original={activePlanningWeek:1,plan:{0:[null,null,'rice',null]},alternateWeek:{plan:{}},mealServings:{},dinnerSides:{},servings:2,mealTypes:['Dinner'],custom:['important']};
const same=structuredClone(original);
const preview={'1-0-2':'beans'};
assert.deepEqual(checkPlanConflict(original,same),{ok:true});
let result=preparePlanPatch(original,same,preview,previewAccount);
assert.equal(result.ok,true);
assert.equal(result.fields.plan[0][2],'beans');
assert.equal(same.plan[0][2],'rice','No mutation of current snapshot');
assert.equal(same.custom[0],'important','Unrelated profile fields untouched');
for(const field of ['plan','alternateWeek','activePlanningWeek','mealServings','dinnerSides','servings','mealTypes']){
 const changed=structuredClone(original);
 changed[field]=field==='plan'?{0:[null,null,'fish',null]}:field==='activePlanningWeek'?2:field==='servings'?5:field==='mealTypes'?['Lunch']:field==='alternateWeek'?{plan:{1:[null,null,'salmon',null]}}:{changed:true};
 assert.equal(preparePlanPatch(original,changed,preview,previewAccount).ok,false,'Concurrent change to '+field+' must block save');
}
assert.equal(preparePlanPatch(original,same,{},previewAccount).ok,false);
assert.equal(checkPlanConflict(null,same).ok,false);
console.log('Cloud save conflict preflight checks passed — no cloud writes made');
