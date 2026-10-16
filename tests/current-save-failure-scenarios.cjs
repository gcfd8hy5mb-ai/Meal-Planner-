const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8');
const begin=html.indexOf('let saveSequence=0,');
const finish=html.indexOf(';const fmt=',begin);
assert(begin>=0&&finish>begin,'Unable to locate current production save implementation');
const source=html.slice(begin,finish);
const meals={0:[null,null,'beefTacos',null],1:[null,null,'homeBurgers',null]};
const base=()=>({preferences:{likes:['Mexican'],avoid:'',style:'Anything'},goals:{cal:2200},plan:JSON.parse(JSON.stringify(meals)),alternateWeek:{plan:{}},custom:[]});
async function simulate({changedCloud=false,networkDown=false,emptyLocal=false}={}){
 const original=base(),cloud=base(),local=base(),uid='disposable-test-user';
 if(changedCloud)cloud.plan[0][2]='fajitas';
 if(emptyLocal)local.plan={0:[null,null,null,null]};
 const values=new Map(),status={textContent:''},retry={style:{display:''}};
 const sandbox={
   activeUid:uid,auth:{currentUser:{uid}},signingOut:false,resetInProgress:false,
   state:local,writeChain:Promise.resolve(),reconcileGroceryChecks(){},
   localStorage:{setItem:(k,v)=>values.set(k,v),getItem:k=>values.get(k)||null,removeItem:k=>values.delete(k)},
   document:{getElementById(id){return id==='retryCloudSave'?retry:status}},
   doc:(_db,path,id)=>({path,id}),db:{},
   cloudBaseline:JSON.stringify(original),cloudBaselineUid:uid,
   console:{error(){}},
   async runTransaction(_db,fn){
     if(networkDown)throw Error('offline');
     const tx={async get(){return {exists:()=>true,data:()=>cloud}},update(_ref,next){Object.assign(cloud,next)}};
     return fn(tx);
   }
 };
 vm.runInNewContext(source+';globalThis.invokeSave=save;globalThis.statusSnapshot=()=>({cloudBaseline,lastSaveError});',sandbox);
 sandbox.invokeSave();
 await sandbox.writeChain;
 return {status:status.textContent,retry:retry.style.display,localBackup:values.get('tablewise-v1-'+uid),pending:values.get('tablewise-pending-'+uid),cloud,error:sandbox.statusSnapshot().lastSaveError};
}
(async()=>{
 const success=await simulate();
 assert.match(success.status,/Saved to cloud/);
 assert.equal(success.pending,undefined);
 assert.equal(success.cloud.plan[0][2],'beefTacos');
 const conflict=await simulate({changedCloud:true});
 assert.match(conflict.status,/Cloud changed on another device/);
 assert.equal(conflict.retry,'none');
 assert.ok(conflict.localBackup);
 assert.equal(conflict.pending,'1');
 assert.equal(conflict.cloud.plan[0][2],'fajitas');
 const offline=await simulate({networkDown:true});
 assert.match(offline.status,/Cloud save failed/);
 assert.equal(offline.retry,'inline-block');
 assert.ok(offline.localBackup);
 assert.equal(offline.pending,'1');
 const empty=await simulate({emptyLocal:true});
 assert.match(empty.status,/Cloud save failed/);
 assert.equal(empty.cloud.plan[0][2],'beefTacos');
 assert.ok(empty.localBackup);
 console.log('PASS current production save: normal save, stale device, offline backup, empty overwrite');
})().catch(e=>{console.error(e);process.exitCode=1});