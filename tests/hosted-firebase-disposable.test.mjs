import assert from 'node:assert/strict';
import {initializeApp,deleteApp} from 'firebase/app';
import {getAuth,signInWithEmailAndPassword,signOut} from 'firebase/auth';
import {getFirestore,doc,getDocFromServer,setDoc,runTransaction,deleteDoc} from 'firebase/firestore';
import {commitLuxuryPreview,readPendingLuxuryDraft,verifyLuxurySavedPlan} from '../luxury-v2/save-flow.mjs';

const required=['TABLEWISE_FIREBASE_API_KEY','TABLEWISE_FIREBASE_PROJECT_ID','TABLEWISE_TEST_A_EMAIL','TABLEWISE_TEST_A_PASSWORD','TABLEWISE_TEST_B_EMAIL','TABLEWISE_TEST_B_PASSWORD'];
for(const name of required)if(!process.env[name])throw Error('Missing required hosted test secret: '+name);
const env=process.env;
assert.equal(env.TABLEWISE_HOSTED_TEST_APPROVED,'yes','Manual approval required');
assert.equal(env.TABLEWISE_FIREBASE_PROJECT_ID,'meal-planner-a478e','Unexpected project');
assert.notEqual(env.TABLEWISE_TEST_A_EMAIL,env.TABLEWISE_TEST_B_EMAIL);
for(const name of ['TABLEWISE_TEST_A_EMAIL','TABLEWISE_TEST_B_EMAIL'])
 assert.match(env[name],/^tablewise-ci-[a-z0-9._+-]+@[^\s@]+\.[^\s@]+$/i,'Only disposable tablewise-ci- accounts may be tested');

const appA=initializeApp({apiKey:env.TABLEWISE_FIREBASE_API_KEY,projectId:env.TABLEWISE_FIREBASE_PROJECT_ID,authDomain:env.TABLEWISE_FIREBASE_PROJECT_ID+'.firebaseapp.com'},'hosted-a');
const appB=initializeApp({apiKey:env.TABLEWISE_FIREBASE_API_KEY,projectId:env.TABLEWISE_FIREBASE_PROJECT_ID,authDomain:env.TABLEWISE_FIREBASE_PROJECT_ID+'.firebaseapp.com'},'hosted-b');
const authA=getAuth(appA),authB=getAuth(appB),dbA=getFirestore(appA),dbB=getFirestore(appB);
const memory=()=>{const values=new Map();return {getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)}};
const expectDenied=async(fn,label)=>assert.rejects(fn,e=>e?.code==='permission-denied',label);
let refA,refB,createdA=false,createdB=false;
try{
 const ua=(await signInWithEmailAndPassword(authA,env.TABLEWISE_TEST_A_EMAIL,env.TABLEWISE_TEST_A_PASSWORD)).user;
 const ub=(await signInWithEmailAndPassword(authB,env.TABLEWISE_TEST_B_EMAIL,env.TABLEWISE_TEST_B_PASSWORD)).user;
 assert.notEqual(ua.uid,ub.uid);
 refA=doc(dbA,'users',ua.uid);refB=doc(dbB,'users',ub.uid);
 // No pre-existing documents may be overwritten or deleted by this workflow.
 assert.equal((await getDocFromServer(refA)).exists(),false,'Test A already has data. Refusing to overwrite');
 assert.equal((await getDocFromServer(refB)).exists(),false,'Test B already has data. Refusing to overwrite');
 const baseline={activePlanningWeek:1,plan:{0:[null,null,'tacos',null]},alternateWeek:{plan:{0:[null,null,'soup',null]}},servings:2,mealServings:{},dinnerSides:{},profile:{displayName:'Disposable CI A'},checked:{'milk|cup':true}};
 await setDoc(refA,baseline);createdA=true;
 await setDoc(refB,{...baseline,profile:{displayName:'Disposable CI B'}});createdB=true;
 // Test both cross-account directions, including overwrites and deletion, using
 // only documents created by this invocation. Never use privileged credentials.
 assert.equal((await getDocFromServer(refA)).data().profile.displayName,'Disposable CI A');
 assert.equal((await getDocFromServer(refB)).data().profile.displayName,'Disposable CI B');
 await expectDenied(()=>getDocFromServer(doc(dbB,'users',ua.uid)),'B cannot read A');
 await expectDenied(()=>setDoc(doc(dbB,'users',ua.uid),{plan:{}}),'B cannot write A');
 await expectDenied(()=>deleteDoc(doc(dbB,'users',ua.uid)),'B cannot delete A');
 await expectDenied(()=>getDocFromServer(doc(dbA,'users',ub.uid)),'A cannot read B');
 await expectDenied(()=>setDoc(doc(dbA,'users',ub.uid),{plan:{}}),'A cannot write B');
 await expectDenied(()=>deleteDoc(doc(dbA,'users',ub.uid)),'A cannot delete B');
 assert.equal((await getDocFromServer(refA)).data().profile.displayName,'Disposable CI A');
 assert.equal((await getDocFromServer(refB)).data().profile.displayName,'Disposable CI B');
 const backup=memory(),preview={'1-0-2':'lasagna','2-0-2':'noodles'};
 const outcome=await commitLuxuryPreview({storage:backup,uid:ua.uid,original:baseline,preview,documentRef:refA,
   getAuthenticatedUid:()=>authA.currentUser?.uid,runTransaction:fn=>runTransaction(dbA,fn),retainBackupUntilVerified:true});
 assert.equal(outcome.awaitingServerVerification,true);
 const saved=(await getDocFromServer(refA)).data();
 assert.equal(verifyLuxurySavedPlan(baseline,preview,saved),true);
 assert.equal(saved.checked['milk|cup'],true);assert.equal(saved.profile.displayName,'Disposable CI A');
 assert.ok(readPendingLuxuryDraft(backup,ua.uid),'Backup stays until server verification');
 backup.removeItem('tablewise-luxury-pending-'+ua.uid);
 assert.equal(readPendingLuxuryDraft(backup,ua.uid),null);
 // Conflicting stale client cannot overwrite a newer plan.
 const stale=memory();
 await assert.rejects(commitLuxuryPreview({storage:stale,uid:ua.uid,original:baseline,preview:{'1-0-2':'pizza'},documentRef:refA,
   getAuthenticatedUid:()=>authA.currentUser?.uid,runTransaction:fn=>runTransaction(dbA,fn)}),/Saved plan changed/);
 assert.ok(readPendingLuxuryDraft(stale,ua.uid),'Conflict retains exportable backup');
 assert.equal((await getDocFromServer(refA)).data().plan[0][2],'lasagna');
 // A sign-out must not allow A's old client to read even its own private
 // document. B must retain its own session and must never see A's data.
 await signOut(authA);
 await expectDenied(()=>getDocFromServer(refA),'Signed-out A cannot read private plan');
 assert.equal((await getDocFromServer(refB)).data().profile.displayName,'Disposable CI B');
 // Restore the disposable A session for the finally-block cleanup; never leave
 // records behind because the security test intentionally signed out.
 const restoredA=(await signInWithEmailAndPassword(authA,env.TABLEWISE_TEST_A_EMAIL,env.TABLEWISE_TEST_A_PASSWORD)).user;
 assert.equal(restoredA.uid,ua.uid,'Disposable cleanup account identity changed');
 console.log('PASS hosted bidirectional read/write/delete isolation, sign-out, dual-week save, server verification, and conflict recovery');
}finally{
 // Delete only documents created by this exact invocation; leave account identities intact.
 const failures=[];
 if(createdA)try{await deleteDoc(refA)}catch(e){failures.push('A cleanup: '+e.message)}
 if(createdB)try{await deleteDoc(refB)}catch(e){failures.push('B cleanup: '+e.message)}
 await Promise.allSettled([signOut(authA),signOut(authB)]);
 await Promise.allSettled([deleteApp(appA),deleteApp(appB)]);
 if(failures.length)throw Error('Disposable test data cleanup requires attention: '+failures.join('; '));
}
