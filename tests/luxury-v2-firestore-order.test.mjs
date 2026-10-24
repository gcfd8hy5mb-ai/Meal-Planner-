import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedPlanSnapshot,checkPlanConflict} from '../luxury-v2/save-guard.mjs';
import {previewAccount} from '../luxury-v2/meal-preview.mjs';
import {verifyLuxurySavedPlan} from '../luxury-v2/save-flow.mjs';
test('Firestore canonical object key ordering preserves dual-week readback match',()=>{
 const original={activePlanningWeek:1,plan:{0:[null,null,'tacos',null]},alternateWeek:{plan:{0:[null,null,'soup',null]}},servings:2,mealServings:{},dinnerSides:{},profile:{displayName:'Disposable CI A'},checked:{'milk|cup':true}};
 const edits={'1-0-2':'lasagna','2-0-2':'noodles'};
 const expected=previewAccount(original,edits);
 const reorder=value=>Array.isArray(value)?value.map(reorder):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,reorder(value[key])])):value;
 const fromFirestore=reorder(expected);
 assert.notDeepEqual(Object.keys(expected.alternateWeek),Object.keys(fromFirestore.alternateWeek));
 assert.equal(selectedPlanSnapshot(expected),selectedPlanSnapshot(fromFirestore));
 assert.deepEqual(checkPlanConflict(expected,fromFirestore),{ok:true});
 assert.equal(verifyLuxurySavedPlan(original,edits,fromFirestore),true);
 fromFirestore.alternateWeek.plan[0][2]='changed-on-server';
 assert.throws(()=>verifyLuxurySavedPlan(original,edits,fromFirestore),/differs/);
});
