import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initializeApp,deleteApp} from 'firebase/app';
import {getAuth,connectAuthEmulator,createUserWithEmailAndPassword,signInWithEmailAndPassword,signOut} from 'firebase/auth';
import {getFirestore,connectFirestoreEmulator,doc,getDoc,setDoc,runTransaction,disableNetwork,enableNetwork} from 'firebase/firestore';
import {guardedSave,CloudSaveConflict} from '../cloud-save-guard.mjs';

const projectId='demo-tablewise-auth-test';
let counter=0;
function client(label){
 const app=initializeApp({apiKey:'fake-emulator-key',authDomain:projectId+'.firebaseapp.com',projectId},label+'-'+(++counter));
 const auth=getAuth(app);
 connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});
 const db=getFirestore(app);
 connectFirestoreEmulator(db,'127.0.0.1',8080);
 return {app,auth,db};
}
const plan=(meal)=>({plan:{'0':[null,null,meal,null]},preferences:{style:'All'},goals:{cal:2200},dinnerSides:{'0':['beans']},custom:'[]'});
const waitForAuth=(auth)=>new Promise((resolve,reject)=>{if(auth.currentUser)return resolve(auth.currentUser);let unsub=auth.onAuthStateChanged(user=>{if(user){unsub();resolve(user)}},reject)});
test('real Firebase Auth SDK emulator: two disposable users, device restore, isolation, stale saves and session switches', {timeout:90000},async()=>{
 const clients=[];
 try{
  const A1=client('owner-phone'),A2=client('owner-second-device'),B=client('other-user');
  clients.push(A1,A2,B);
  const aEmail='tablewise-a-'+Date.now()+'@example.test',bEmail='tablewise-b-'+Date.now()+'@example.test';
  const pass='EmulatorOnly!123456';
  const createdA=await createUserWithEmailAndPassword(A1.auth,aEmail,pass);
  const createdB=await createUserWithEmailAndPassword(B.auth,bEmail,pass);
  const uidA=createdA.user.uid,uidB=createdB.user.uid;
  assert.notEqual(uidA,uidB);
  const refA1=doc(A1.db,'users',uidA),refA2=doc(A2.db,'users',uidA),refB=doc(B.db,'users',uidB);
  const original=plan('tacos'),other=plan('sushi');
  await setDoc(refA1,original);
  await setDoc(refB,other);
  await signInWithEmailAndPassword(A2.auth,aEmail,pass);
  await waitForAuth(A2.auth);
  const restored=(await getDoc(refA2)).data();
  assert.deepEqual(restored,original,'Second signed-in device restores full cloud document');
  const blocked=doc(B.db,'users',uidA);
  await assert.rejects(getDoc(blocked),e=>e.code==='permission-denied','B cannot read A');
  await assert.rejects(setDoc(blocked,plan('stolen')),e=>e.code==='permission-denied','B cannot overwrite A');
  const baseline1=(await getDoc(refA1)).data(),baseline2=(await getDoc(refA2)).data();
  const transaction=(c,ref,confirmed,next,uid,sessionCheck)=>guardedSave({
   runTransaction:fn=>runTransaction(c.db,fn),reference:ref,confirmed,next,uid,
   getUid:()=>c.auth.currentUser?.uid===uid&&sessionCheck()?uid:null
  });
  const aNext={...baseline1,plan:{'0':[null,null,'lasagna',null]}};
  await transaction(A1,refA1,baseline1,aNext,uidA,()=>true);
  assert.equal((await getDoc(refA2)).data().plan['0'][2],'lasagna','Second device observes the first write');
  await assert.rejects(transaction(A2,refA2,baseline2,{...baseline2,plan:{'0':[null,null,'stale',null]}},uidA,()=>true),CloudSaveConflict,'Outdated second device cannot overwrite newer meals');
  assert.equal((await getDoc(refA1)).data().plan['0'][2],'lasagna');
  let epoch=1;const captured=epoch;
  await signOut(A2.auth);epoch++;
  await signInWithEmailAndPassword(A2.auth,aEmail,pass);epoch++;
  const latest=(await getDoc(refA2)).data();
  await assert.rejects(transaction(A2,refA2,latest,{...latest,plan:{'0':[null,null,'stale session',null]}},uidA,()=>epoch===captured),CloudSaveConflict,'Old sign-in epoch cannot write even after signing back into A');
  await transaction(A2,refA2,latest,{...latest,servings:4},uidA,()=>true);
  assert.equal((await getDoc(refA1)).data().servings,4,'Current session may write');
  assert.deepEqual((await getDoc(refB)).data(),other,'Account B unchanged');
  // Reuse the same second-device Firebase app across A -> B -> A changes.
  const A2Last=(await getDoc(refA2)).data();
  await signOut(A2.auth);
  await signInWithEmailAndPassword(A2.auth,bEmail,pass);
  assert.equal(A2.auth.currentUser.uid,uidB,'Same browser is now B');
  await assert.rejects(getDoc(refA2),e=>e.code==='permission-denied','Browser B cannot read A cached route');
  assert.deepEqual((await getDoc(doc(A2.db,'users',uidB))).data(),other,'Browser B retrieves only B meal plan');
  await assert.rejects(transaction(A2,refA2,A2Last,{...A2Last,servings:99},uidA,()=>true),CloudSaveConflict,'Old A write cannot run under B');
  await signOut(A2.auth);
  await signInWithEmailAndPassword(A2.auth,aEmail,pass);
  const A2Restored=(await getDoc(refA2)).data();
  assert.equal(A2Restored.servings,4,'Return to A restores latest A cloud plan');
  assert.deepEqual((await getDoc(refB)).data(),other,'Switching back did not modify B');
  // Firestore transactions must fail safely during loss of connectivity and recover on explicit retry.
  const beforeOutage=(await getDoc(refA2)).data();
  await disableNetwork(A2.db);
  try{
   await assert.rejects(transaction(A2,refA2,beforeOutage,{...beforeOutage,servings:6},uidA,()=>true),
    error=>Boolean(error),'Offline transaction must report an error rather than claim success');
  }finally{await enableNetwork(A2.db)}
  assert.equal((await getDoc(refA1)).data().servings,4,'Offline attempt must not modify cloud plan');
  const retryBaseline=(await getDoc(refA2)).data();
  await transaction(A2,refA2,retryBaseline,{...retryBaseline,servings:6},uidA,()=>true);
  assert.equal((await getDoc(refA1)).data().servings,6,'Explicit online retry saves successfully');
  await signOut(A1.auth);
  assert.equal(A1.auth.currentUser,null);
  await signInWithEmailAndPassword(A1.auth,aEmail,pass);
  assert.equal((await getDoc(refA1)).data().servings,6,'Sign-out/in restores data after offline retry');
 }finally{await Promise.allSettled(clients.map(c=>deleteApp(c.app)));}
});
