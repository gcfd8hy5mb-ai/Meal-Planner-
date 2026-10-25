import assert from 'node:assert/strict';
import {initializeApp,deleteApp} from 'firebase/app';
import {getAuth,signInWithEmailAndPassword,signOut} from 'firebase/auth';
import {getFirestore,doc,getDocFromServer,setDoc,runTransaction,deleteDoc} from 'firebase/firestore';
import {commitCalendarRenewal} from '../luxury-v2/renewal-commit.mjs';
import {verifyRenewalReadback} from '../luxury-v2/renewal-verify.mjs';
import {prepareRenewal} from '../luxury-v2/renewal-safety.mjs';
const env=process.env;
for(const key of ['TABLEWISE_FIREBASE_API_KEY','TABLEWISE_FIREBASE_PROJECT_ID','TABLEWISE_TEST_A_EMAIL','TABLEWISE_TEST_A_PASSWORD','TABLEWISE_TEST_B_EMAIL','TABLEWISE_TEST_B_PASSWORD'])assert.ok(env[key],key+' missing');
assert.equal(env.TABLEWISE_HOSTED_TEST_APPROVED,'yes');
assert.equal(env.TABLEWISE_FIREBASE_PROJECT_ID,'meal-planner-a478e');
assert.notEqual(env.TABLEWISE_TEST_A_EMAIL,env.TABLEWISE_TEST_B_EMAIL);
for(const key of ['TABLEWISE_TEST_A_EMAIL','TABLEWISE_TEST_B_EMAIL'])assert.match(env[key],/^tablewise-ci-[a-z0-9._+-]+@[^\s@]+\.[^\s@]+$/i);
const a=initializeApp({apiKey:env.TABLEWISE_FIREBASE_API_KEY,projectId:env.TABLEWISE_FIREBASE_PROJECT_ID,authDomain:env.TABLEWISE_FIREBASE_PROJECT_ID+'.firebaseapp.com'},'renew-a');
const b=initializeApp({apiKey:env.TABLEWISE_FIREBASE_API_KEY,projectId:env.TABLEWISE_FIREBASE_PROJECT_ID,authDomain:env.TABLEWISE_FIREBASE_PROJECT_ID+'.firebaseapp.com'},'renew-b');
const authA=getAuth(a),authB=getAuth(b),dbA=getFirestore(a),dbB=getFirestore(b);
let refA,refB,archiveRef,ownedA=false,ownedB=false;
try{
 const ua=(await signInWithEmailAndPassword(authA,env.TABLEWISE_TEST_A_EMAIL,env.TABLEWISE_TEST_A_PASSWORD)).user;
 const ub=(await signInWithEmailAndPassword(authB,env.TABLEWISE_TEST_B_EMAIL,env.TABLEWISE_TEST_B_PASSWORD)).user;
 assert.notEqual(ua.uid,ub.uid);
 refA=doc(dbA,'users',ua.uid);refB=doc(dbB,'users',ub.uid);archiveRef=doc(dbA,'users',ua.uid,'calendarArchives','2026-10-25');
 assert.equal((await getDocFromServer(refA)).exists(),false,'Refusing to touch existing A data');
 assert.equal((await getDocFromServer(refB)).exists(),false,'Refusing to touch existing B data');
 assert.equal((await getDocFromServer(archiveRef)).exists(),false,'Refusing to touch existing archive');
 const baseline={calendarWeekAnchor:'2026-10-25',calendarInitialWeek:1,activePlanningWeek:1,plan:Object.fromEntries(Array.from({length:7},(_,i)=>[i,['oats','soup','old-'+i,null]])),alternateWeek:{plan:Object.fromEntries(Array.from({length:7},(_,i)=>[i,['eggs','salad','other-'+i,null]]))},mealServings:{'0-0':2,'0-2':4},dinnerSides:{0:['potatoes']},profile:{displayName:'Disposable A'}};
 await setDoc(refA,baseline);ownedA=true;
 await setDoc(refB,{...baseline,profile:{displayName:'Disposable B'}});ownedB=true;
 const generated={week1:Object.fromEntries(Array.from({length:7},(_,i)=>[i,['oats','soup','new-'+i,null]])),week2:Object.fromEntries(Array.from({length:7},(_,i)=>[i,['eggs','salad','later-'+i,null]]))};
 const now=new Date(2026,10,8,12);
 const committed=await commitCalendarRenewal({original:baseline,generated,uid:ua.uid,now,getAuthenticatedUid:()=>authA.currentUser?.uid,runTransaction:fn=>runTransaction(dbA,fn),userRef:refA,archiveRef});
 assert.equal(committed.anchor,'2026-11-08');
 const [saved,archived]=await Promise.all([getDocFromServer(refA),getDocFromServer(archiveRef)]);
 const proposed=prepareRenewal(baseline,generated,now);
 assert.equal(verifyRenewalReadback(saved.data(),archived.data(),proposed.proposed,baseline),true,'Both weeks and archive must match');
 assert.equal(saved.data().profile.displayName,'Disposable A');
 assert.equal(saved.data().mealServings['0-0'],2);
 await assert.rejects(commitCalendarRenewal({original:baseline,generated,uid:ua.uid,now,getAuthenticatedUid:()=>authA.currentUser?.uid,runTransaction:fn=>runTransaction(dbA,fn),userRef:refA,archiveRef}),/archived/);
 await assert.rejects(getDocFromServer(doc(dbB,'users',ua.uid,'calendarArchives','2026-10-25')),e=>e?.code==='permission-denied');
 assert.equal((await getDocFromServer(refB)).data().profile.displayName,'Disposable B');
 console.log('PASS disposable hosted calendar renewal and archived plan');
}finally{
 if(authA.currentUser){
  if(ownedA&&archiveRef)await deleteDoc(archiveRef).catch(e=>{throw Error('Archive cleanup failed: '+e.message)});
  if(ownedA&&refA)await deleteDoc(refA).catch(e=>{throw Error('Account A cleanup failed: '+e.message)});
 }
 if(authB.currentUser&&ownedB&&refB)await deleteDoc(refB).catch(e=>{throw Error('Account B cleanup failed: '+e.message)});
 await Promise.allSettled([signOut(authA),signOut(authB)]);
 await Promise.allSettled([deleteApp(a),deleteApp(b)]);
}
