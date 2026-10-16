import assert from 'node:assert/strict';
import {initializeApp,deleteApp} from 'firebase/app';
import {getAuth,signInWithEmailAndPassword,signOut} from 'firebase/auth';
import {getFirestore,doc,getDocFromServer,setDoc,deleteDoc,runTransaction} from 'firebase/firestore';
const env=process.env;
for(const key of ['TABLEWISE_FIREBASE_PROJECT_ID','TABLEWISE_FIREBASE_API_KEY','TABLEWISE_TEST_A_EMAIL','TABLEWISE_TEST_A_PASSWORD','TABLEWISE_TEST_B_EMAIL','TABLEWISE_TEST_B_PASSWORD'])assert.ok(env[key],'Missing '+key);
assert.equal(env.TABLEWISE_HOSTED_TEST_APPROVED,'yes');
assert.equal(env.TABLEWISE_FIREBASE_PROJECT_ID,'meal-planner-a478e');
assert.notEqual(env.TABLEWISE_TEST_A_EMAIL,env.TABLEWISE_TEST_B_EMAIL);
for(const key of ['TABLEWISE_TEST_A_EMAIL','TABLEWISE_TEST_B_EMAIL'])assert.match(env[key],/^tablewise-ci-[a-z0-9._+-]+@[^\s@]+\.[^\s@]+$/i);
const config={apiKey:env.TABLEWISE_FIREBASE_API_KEY,projectId:env.TABLEWISE_FIREBASE_PROJECT_ID,authDomain:env.TABLEWISE_FIREBASE_PROJECT_ID+'.firebaseapp.com'};
const appA=initializeApp(config,'current-hosted-a'),appB=initializeApp(config,'current-hosted-b');
const authA=getAuth(appA),authB=getAuth(appB),dbA=getFirestore(appA),dbB=getFirestore(appB);
let refA,refB,createdA=false,createdB=false;
try {
 const a=(await signInWithEmailAndPassword(authA,env.TABLEWISE_TEST_A_EMAIL,env.TABLEWISE_TEST_A_PASSWORD)).user;
 const b=(await signInWithEmailAndPassword(authB,env.TABLEWISE_TEST_B_EMAIL,env.TABLEWISE_TEST_B_PASSWORD)).user;
 assert.notEqual(a.uid,b.uid);
 refA=doc(dbA,'users',a.uid);refB=doc(dbB,'users',b.uid);
 assert.equal((await getDocFromServer(refA)).exists(),false,'Disposable A contains data: abort without overwrite');
 assert.equal((await getDocFromServer(refB)).exists(),false,'Disposable B contains data: abort without overwrite');
 const state={preferences:{likes:['Mexican'],avoid:'',style:'Anything'},goals:{cal:2200},plan:{'0':[null,null,'beefTacos',null]},alternateWeek:{plan:{}},weekSetupComplete:true,custom:'[]'};
 await setDoc(refA,state);createdA=true;
 await setDoc(refB,{...state,plan:{'0':[null,null,'fajitas',null]}});createdB=true;
 const deny=async work=>assert.rejects(work,e=>e?.code==='permission-denied');
 await deny(()=>getDocFromServer(doc(dbB,'users',a.uid)));
 await deny(()=>setDoc(doc(dbB,'users',a.uid),state));
 await deny(()=>deleteDoc(doc(dbB,'users',a.uid)));
 await deny(()=>getDocFromServer(doc(dbA,'users',b.uid)));
 const baseline=JSON.stringify((await getDocFromServer(refA)).data());
 await runTransaction(dbA,async tx=>{
  const snap=await tx.get(refA);assert.equal(JSON.stringify(snap.data()),baseline);
  tx.update(refA,{plan:{'0':[null,null,'homeBurgers',null]}});
 });
 assert.equal((await getDocFromServer(refA)).data().plan['0'][2],'homeBurgers');
 await assert.rejects(runTransaction(dbA,async tx=>{
   const snap=await tx.get(refA);
   if(JSON.stringify(snap.data())!==baseline)throw Error('Cloud changed on another device');
   tx.update(refA,{plan:state.plan});
 }),/Cloud changed on another device/);
 assert.equal((await getDocFromServer(refA)).data().plan['0'][2],'homeBurgers');
 await deleteDoc(refA);createdA=false;
 await deleteDoc(refB);createdB=false;
 await signOut(authB);assert.equal(authB.currentUser,null);
 await signOut(authA);assert.equal(authA.currentUser,null);
 console.log('PASS current hosted Firebase disposable account isolation, save, readback, conflict, sign-out');
} finally {
 const failures=[];
 if(createdA)try{await deleteDoc(refA)}catch(e){failures.push('A cleanup '+e.message)}
 if(createdB)try{await deleteDoc(refB)}catch(e){failures.push('B cleanup '+e.message)}
 await Promise.allSettled([signOut(authA),signOut(authB)]);
 await Promise.allSettled([deleteApp(appA),deleteApp(appB)]);
 if(failures.length)throw Error(failures.join('; '));
}
