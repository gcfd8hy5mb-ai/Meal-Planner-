import assert from 'node:assert/strict';
import {commitCalendarRenewal} from '../luxury-v2/renewal-commit.mjs';
const start={calendarWeekAnchor:'2026-10-25',calendarInitialWeek:1,activePlanningWeek:1,plan:{0:['oats','sandwich','chicken',null]},alternateWeek:{plan:{0:['eggs','salad','tacos',null]},mealServings:{'0-0':3,'0-2':6},dinnerSides:{0:['beans']}},mealServings:{'0-0':2,'0-2':5},dinnerSides:{0:['corn']}};
const recipeIds=Array.from({length:14},(_,i)=>'new-'+i);
const generated={week1:Object.fromEntries(Array.from({length:7},(_,i)=>[i,['oats','sandwich',recipeIds[i],null]])),week2:Object.fromEntries(Array.from({length:7},(_,i)=>[i,['eggs','salad',recipeIds[i+7],null]]))};
const userRef={id:'alice'},archiveRef={id:'2026-10-25'},uid='alice',now=new Date(2026,10,8,12);
let account=structuredClone(start),archive=null;
const transaction=async fn=>{
 const writes=[];
 const tx={get:async ref=>ref===userRef?{exists:()=>true,data:()=>structuredClone(account)}:{exists:()=>archive!==null,data:()=>archive},
 set:(ref,fields)=>writes.push(()=>{assert.equal(ref,archiveRef);archive=structuredClone(fields)}),
 update:(ref,fields)=>writes.push(()=>{assert.equal(ref,userRef);account={...account,...structuredClone(fields)}})};
 const result=await fn(tx);writes.forEach(write=>write());return result;
};
const args={original:start,generated,uid,now,getAuthenticatedUid:()=>uid,runTransaction:transaction,userRef,archiveRef};
const result=await commitCalendarRenewal(args);
assert.equal(result.anchor,'2026-11-08');
assert.equal(archive.plan[0][2],'chicken');
assert.equal(archive.alternateWeek.plan[0][2],'tacos');
assert.equal(account.plan[0][2],'new-0');
assert.equal(account.alternateWeek.plan[0][2],'new-7');
assert.equal(account.plan[0][0],'oats','Do not delete breakfast');
assert.equal(account.mealServings['0-0'],2,'Preserve breakfast portion');
assert.equal(account.mealServings['0-2'],undefined,'Old dinner overrides must not carry over');
assert.deepEqual(account.dinnerSides,{});
assert.equal(account.alternateWeek.mealServings['0-0'],3,'Preserve second-week breakfast portions');
assert.equal(account.alternateWeek.mealServings['0-2'],undefined,'Remove old second-week dinner portions');
assert.deepEqual(account.alternateWeek.dinnerSides,{},'Remove old second-week dinner sides');
await assert.rejects(commitCalendarRenewal(args),/already been archived/);
await assert.rejects(commitCalendarRenewal({...args,getAuthenticatedUid:()=> 'other'}),/mismatch/);
console.log('PASS atomic archive and plan, saved breakfast/lunch, stale servings, duplicate rejection and account isolation');
