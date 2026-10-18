import assert from 'node:assert/strict';
import {replacePreviewMeal,previewAccount,hasPreviewEdits} from '../luxury-v2/meal-preview.mjs';
import {commitLuxuryPreview,readPendingLuxuryDraft,classifyLuxuryRecovery,pendingKey} from '../luxury-v2/save-flow.mjs';

// iPhone journey: change week 1, switch to week 2, change again, export,
// interrupt cloud save, reopen device, then block a conflicting remote update.
const uid='iphone-journey-user';
const saved={
 activePlanningWeek:1, servings:2,
 plan:{0:[null,null,'pasta',null]}, mealServings:{'0-2':4}, dinnerSides:{0:['salad']},
 alternateWeek:{plan:{1:[null,null,'soup',null]},mealServings:{},dinnerSides:{}}
};
const baseline=JSON.stringify(saved);
let edits={};
edits=replacePreviewMeal(saved,edits,1,0,2,'tacos');
let shown=previewAccount(saved,edits);
assert.equal(shown.plan[0][2],'tacos');
assert.equal(shown.mealServings['0-2'],undefined);
assert.equal(shown.dinnerSides[0],undefined);
assert.equal(saved.plan[0][2],'pasta');
edits=replacePreviewMeal(saved,edits,2,1,2,'stir-fry');
shown=previewAccount(saved,edits);
assert.equal(shown.alternateWeek.plan[1][2],'stir-fry');
assert.equal(shown.plan[0][2],'tacos');
assert.equal(JSON.stringify(saved),baseline,'Switching weeks cannot mutate saved account');

const exported=JSON.parse(JSON.stringify({version:1,uid,original:saved,preview:edits}));
assert.deepEqual(previewAccount(exported.original,exported.preview),shown,'Export reconstructs both edited weeks');
const records=new Map();
const storage={
 getItem:key=>records.get(key)??null,
 setItem:(key,value)=>records.set(key,value),
 removeItem:key=>records.delete(key)
};
let attempted=0;
const write={storage,uid,original:saved,preview:edits,documentRef:{id:uid},getAuthenticatedUid:()=>uid,
 runTransaction:async()=>{attempted++;throw Error('iPhone connection interrupted')}};
await assert.rejects(commitLuxuryPreview(write),/connection interrupted/);
assert.equal(attempted,1);
assert.deepEqual(readPendingLuxuryDraft(storage,uid),exported);
assert.equal(classifyLuxuryRecovery(readPendingLuxuryDraft(storage,uid),saved,uid).status,'unsaved');

const reopenedStorage={getItem:storage.getItem,setItem:storage.setItem,removeItem:storage.removeItem};
assert.deepEqual(readPendingLuxuryDraft(reopenedStorage,uid).preview,edits,'Device restart retains the interrupted draft');
await assert.rejects(commitLuxuryPreview({...write,storage:reopenedStorage}),/unsaved luxury draft/);
assert.equal(attempted,1,'Reopening must not silently replay a write');
const otherDevice={...saved,alternateWeek:{...saved.alternateWeek,plan:{1:[null,null,'burgers',null]}}};
assert.equal(classifyLuxuryRecovery(readPendingLuxuryDraft(storage,uid),otherDevice,uid).status,'conflict');
assert.equal(classifyLuxuryRecovery(readPendingLuxuryDraft(storage,uid),shown,uid).status,'already-saved');
assert.equal(records.has(pendingKey(uid)),true,'Conflicting edits remain exportable');
assert.equal(hasPreviewEdits({}),false);
assert.equal(JSON.stringify(saved),baseline,'Discarding the preview never changes saved data');
console.log('PASS: iPhone dual-week edits, draft export, interrupted save, reopen and conflict guard');

// Exercise Kroger's delayed request/account-switch races in the existing iPhone CI journey.
await import('./kroger-account-switch-race.test.mjs');

// Run final structural/release-safety audit in the existing iPhone CI gate.
await import('./luxury-release-audit.test.mjs');
