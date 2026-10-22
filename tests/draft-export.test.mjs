import assert from 'node:assert/strict';
import {serializeUnsavedPlan} from '../draft-export.mjs';
const plan={plan:{0:[null,null,'chicken',null]},alternateWeek:{plan:{1:[null,null,'rice',null]}},preferences:{style:'Any'},goals:{type:'balanced'},custom:[{id:'my-food'}],dinnerSides:{0:['salad']},servings:4};
const frozen=structuredClone(plan),date=new Date('2026-10-14T19:00:00.000Z');
const file=JSON.parse(serializeUnsavedPlan(plan,date));
assert.equal(file.format,'tablewise-unsaved-plan-v1');
assert.equal(file.savedAt,date.toISOString());
assert.deepEqual(file.plan,plan,'All plan data and custom recipes preserved');
assert.deepEqual(plan,frozen,'Export never mutates active plan');
plan.plan[0][2]='changed-after-export';
assert.equal(file.plan.plan[0][2],'chicken','Export is an immutable snapshot');
for(const invalid of [null,{},[],{plan:{},preferences:{}},{plan:{},goals:{}},{plan:[],goals:{},preferences:{}}]){
 assert.throws(()=>serializeUnsavedPlan(invalid,date),/incomplete/i);
}
assert.throws(()=>serializeUnsavedPlan(frozen,new Date('invalid')),/timestamp/);
console.log('Unsaved draft export completeness and isolation tests passed');
