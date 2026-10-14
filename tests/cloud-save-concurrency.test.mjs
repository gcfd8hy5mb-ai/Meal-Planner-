import assert from 'node:assert/strict';
import {guardedSave,CloudSaveConflict} from '../cloud-save-guard.mjs';
// Simulates Firestore atomic transaction commits and version-based retries in two sessions.
const original={plan:{0:[null,null,'chicken',null]},servings:2,custom:'[]'};
let server=structuredClone(original),version=0,commitCount=0;
function session(uid='A'){
 const reference={id:uid};
 return {uid,reference,getUid:()=>uid,confirmed:structuredClone(original)};
}
async function optimisticTransaction(work){
 for(let attempt=0;attempt<4;attempt++){
  const readVersion=version;let pending=null;
  const tx={
   get:async()=>({exists:()=>server!==null,data:()=>structuredClone(server)}),
   set:(_,data)=>{pending=structuredClone(data)}
  };
  const result=await work(tx);
  // Simulate a concurrent write between snapshot read and transaction commit.
  await Promise.resolve();
  if(version!==readVersion)continue;
  if(pending){server=pending;version++;commitCount++}
  return result;
 }
 throw Error('transaction contention');
}
const a=session(),b=session();
const outcomes=await Promise.allSettled([
 guardedSave({...a,next:{...original,servings:3},runTransaction:optimisticTransaction}),
 guardedSave({...b,next:{...original,plan:{0:[null,null,'salmon',null]}},runTransaction:optimisticTransaction})
]);
assert.equal(outcomes.filter(x=>x.status==='fulfilled').length,1,'Exactly one stale-baseline session can commit');
assert.equal(outcomes.filter(x=>x.status==='rejected'&&x.reason instanceof CloudSaveConflict).length,1,'Other session must receive conflict');
assert.equal(commitCount,1,'No lost update from concurrent sessions');
assert.ok(server.servings===3 || server.plan[0][2]==='salmon','Committed winner preserved');
const old=structuredClone(server);
const stale=session();
await assert.rejects(guardedSave({...stale,next:{...original,servings:9},runTransaction:optimisticTransaction}),CloudSaveConflict);
assert.deepEqual(server,old,'Rejected stale write leaves server unchanged');
assert.equal(commitCount,1);
console.log('Atomic two-session conflict simulations passed');
