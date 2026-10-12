import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
let env;
before(async () => {
  env = await initializeTestEnvironment({ projectId: 'tablewise-rules-test', firestore: { host: '127.0.0.1', port: 8080 } });
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
