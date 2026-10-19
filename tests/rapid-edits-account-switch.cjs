const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8'),i=html.indexOf('let saveSequence=0,'),j=html.indexOf(';const fmt=',i);
assert(i>=0&&j>i);
const source=html.slice(i,j);
const base=()=>({preferences:{likes:['Mexican'],style:'Anything',avoid:''},goals:{cal:2200},plan:{0:[null,null,'beefTacos',null]},alternateWeek:{plan:{}},custom:[]});
async function trial(switchAccount=false){
 const cloud=base(),stored=new Map(),uid='fake-account-a';let transactions=0;
 const sandbox={__base:base(),activeUid:uid,auth:{currentUser:{uid}},signingOut:false,resetInProgress:false,state:base(),writeChain:Promise.resolve(),reconcileGroceryChecks(){},console:{error(){}},db:{},doc:(_db,path,id)=>({path,id}),localStorage:{setItem:(k,v)=>stored.set(k,v),removeItem:k=>stored.delete(k)},document:{getElementById:k=>k==='retryCloudSave'?{style:{}}:{textContent:''}},async runTransaction(_db,fn){transactions++;const tx={get:async()=>({exists:()=>true,data:()=>cloud}),update:(_ref,data)=>Object.assign(cloud,data)};return fn(tx)}};
 vm.runInNewContext(source+';cloudBaseline=JSON.stringify(globalThis.__base);cloudBaselineUid="fake-account-a";globalThis.executeSave=save;',sandbox);
 sandbox.executeSave();
 sandbox.state.plan[0][2]='homeBurgers';
 sandbox.executeSave();
 if(switchAccount){sandbox.activeUid='fake-account-b';sandbox.auth.currentUser={uid:'fake-account-b'}}
 await sandbox.writeChain;
 if(switchAccount){assert.equal(transactions,0);assert.equal(cloud.plan[0][2],'beefTacos');assert.ok(stored.get('tablewise-v1-'+uid));assert.equal(stored.get('tablewise-pending-'+uid),'1')}
 else {assert.equal(transactions,2);assert.equal(cloud.plan[0][2],'homeBurgers');assert.equal(stored.get('tablewise-pending-'+uid),undefined)}
}
(async()=>{await trial(false);await trial(true);console.log('PASS rapid queued edits retain latest selection; account switch stops writes and keeps backup')})().catch(e=>{console.error(e);process.exitCode=1});
