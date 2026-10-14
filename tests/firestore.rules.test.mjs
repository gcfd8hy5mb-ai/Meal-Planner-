import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, deleteDoc, runTransaction } from 'firebase/firestore';
import { guardedSave, CloudSaveConflict, createOnlyAccount } from '../cloud-save-guard.mjs';
let env;
before(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-tablewise-rules-test', firestore: { host: '127.0.0.1', port: 8080 } });
});
after(async () => { if (env) await env.cleanup(); });
test('owner can read and write own meal data', async () => {
  const db = env.authenticatedContext('user-a').firestore();
  await assertSucceeds(setDoc(doc(db, 'users/user-a'), { plan: { '0': ['tacos'] } }));
  const result = await assertSucceeds(getDoc(doc(db, 'users/user-a')));
  assert.equal(result.data().plan['0'][0], 'tacos');
});
test('other signed-in user cannot read, overwrite, or delete meals', async () => {
  const a = env.authenticatedContext('user-a').firestore();
  const b = env.authenticatedContext('user-b').firestore();
  await assertSucceeds(setDoc(doc(a, 'users/user-a'), { plan: { '0': ['tacos'] } }));
  await assertFails(getDoc(doc(b, 'users/user-a')));
  await assertFails(setDoc(doc(b, 'users/user-a'), { plan: { '0': ['stolen'] } }));
  await assertFails(deleteDoc(doc(b, 'users/user-a')));
});
test('anonymous visitors cannot read or write meals', async () => {
  const db = env.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(db, 'users/user-a')));
  await assertFails(setDoc(doc(db, 'users/user-a'), { plan: {} }));
});
test('owner-only rules apply to nested documents', async () => {
  const a = env.authenticatedContext('user-a').firestore();
  const b = env.authenticatedContext('user-b').firestore();
  const nested = doc(a, 'users/user-a/settings/preferences');
  await assertSucceeds(setDoc(nested, { cuisine: 'Mexican' }));
  await assertFails(getDoc(doc(b, 'users/user-a/settings/preferences')));
});
test('authenticated users cannot access unrelated collections', async () => {
  const a = env.authenticatedContext('user-a').firestore();
  await assertFails(setDoc(doc(a, 'admin/secrets'), { enabled: true }));
  await assertFails(getDoc(doc(a, 'admin/secrets')));
});

test('meal types, grocery checkmarks and sides survive simulated second-device reload', async () => {
  const firstDevice = env.authenticatedContext('meal-sync-user').firestore();
  const secondDevice = env.authenticatedContext('meal-sync-user').firestore();
  const path = 'users/meal-sync-user';
  const original = {
    goals: { cal: 2200, p: 140 },
    preferences: { style: 'Anything', avoid: '' },
    mealTypes: ['Lunch', 'Dinner'],
    mealScope: 'all',
    plan: { '0': ['oats', 'sandwich', 'homeCfs', 'apple'] },
    checked: { 'black beans|cup': true, 'cube steak|oz': false },
    dinnerSides: { '0': ['beans', 'corn'] },
    custom: [{ id: 'family-meal', name: 'Family Recipe', ingredients: [['Chicken', 6, 'oz']] }],
    servings: 4,
  };
  await assertSucceeds(setDoc(doc(firstDevice, path), {...original, custom: JSON.stringify(original.custom)}));
  const restored = (await assertSucceeds(getDoc(doc(secondDevice, path)))).data();
  restored.custom = JSON.parse(restored.custom);
  assert.deepEqual(restored.mealTypes, original.mealTypes);
  assert.deepEqual(restored.checked, original.checked);
  assert.deepEqual(restored.dinnerSides, original.dinnerSides);
  assert.deepEqual(restored.plan, original.plan);
  assert.deepEqual(restored.custom, original.custom);

  const updated = { ...restored, mealTypes: ['Dinner'], checked: { ...restored.checked, 'cube steak|oz': true } };
  await assertSucceeds(setDoc(doc(secondDevice, path), {...updated, custom: JSON.stringify(updated.custom)}));
  const reloaded = (await assertSucceeds(getDoc(doc(firstDevice, path)))).data();
  reloaded.custom = JSON.parse(reloaded.custom);
  assert.deepEqual(reloaded.mealTypes, ['Dinner']);
  assert.equal(reloaded.checked['black beans|cup'], true);
  assert.equal(reloaded.checked['cube steak|oz'], true);
  assert.deepEqual(reloaded.plan, original.plan);
  assert.deepEqual(reloaded.dinnerSides, original.dinnerSides);
  assert.deepEqual(reloaded.custom, original.custom);
  await assertFails(getDoc(doc(env.authenticatedContext('different-user').firestore(), path)));
});

test('emulator: simultaneous guarded edits on two devices never silently overwrite', async () => {
  const first = env.authenticatedContext('conflict-device-owner').firestore();
  const second = env.authenticatedContext('conflict-device-owner').firestore();
  const path='users/conflict-device-owner';
  const source={plan:{'0':[null,null,'rice',null]},servings:2,preferences:{style:'Anything'},goals:{type:'balance'},custom:'[]'};
  await setDoc(doc(first,path),source);
  const baselineA=(await getDoc(doc(first,path))).data();
  const baselineB=(await getDoc(doc(second,path))).data();
  const save=(db,confirmed,next)=>guardedSave({
    runTransaction:cb=>runTransaction(db,cb),
    reference:doc(db,path),
    confirmed,next,uid:'conflict-device-owner',getUid:()=> 'conflict-device-owner'
  });
  const outcomes=await Promise.allSettled([
    save(first,baselineA,{...source,servings:3}),
    save(second,baselineB,{...source,plan:{'0':[null,null,'salmon',null]}})
  ]);
  assert.equal(outcomes.filter(x=>x.status==='fulfilled').length,1,'One save should succeed');
  assert.equal(outcomes.filter(x=>x.status==='rejected' && x.reason instanceof CloudSaveConflict).length,1,'Stale save must be rejected');
  const final=(await getDoc(doc(first,path))).data();
  assert.ok((final.servings===3&&final.plan['0'][2]==='rice')||(final.servings===2&&final.plan['0'][2]==='salmon'),'Winner persisted atomically');
  await assert.rejects(save(second,baselineB,{...source,servings:9}),CloudSaveConflict);
  assert.deepEqual((await getDoc(doc(first,path))).data(),final,'Rejected stale save cannot alter winner');
});

test('emulator: guarded account save cannot access another owner or recreate deleted plan',async()=>{
 const owner=env.authenticatedContext('isolated-plan-owner').firestore();
 const stranger=env.authenticatedContext('isolated-plan-stranger').firestore();
 const path='users/isolated-plan-owner';
 const source={plan:{'0':[null,null,'pasta',null]},preferences:{style:'Anything'},goals:{type:'balance'}};
 await setDoc(doc(owner,path),source);
 const attempt=({db,uid,confirmed,next})=>guardedSave({runTransaction:cb=>runTransaction(db,cb),reference:doc(db,path),uid,getUid:()=>uid,confirmed,next});
 await assert.rejects(attempt({db:stranger,uid:'isolated-plan-stranger',confirmed:source,next:{...source,plan:{}}}),CloudSaveConflict,'Wrong uid rejected before write');
 await assertFails(runTransaction(stranger,async tx=>tx.get(doc(stranger,path))),'Firestore rules deny read');
 assert.deepEqual((await getDoc(doc(owner,path))).data(),source);
 await deleteDoc(doc(owner,path));
 await assert.rejects(attempt({db:owner,uid:'isolated-plan-owner',confirmed:source,next:source}),CloudSaveConflict,'Deleted plans cannot be recreated by stale writer');
 await createOnlyAccount({runTransaction:cb=>runTransaction(owner,cb),reference:doc(owner,path),uid:'isolated-plan-owner',getUid:()=> 'isolated-plan-owner',initialDocument:source});
 await assert.rejects(createOnlyAccount({runTransaction:cb=>runTransaction(owner,cb),reference:doc(owner,path),uid:'isolated-plan-owner',getUid:()=> 'isolated-plan-owner',initialDocument:source}),CloudSaveConflict,'Second create-only cannot overwrite existing plan');
});
