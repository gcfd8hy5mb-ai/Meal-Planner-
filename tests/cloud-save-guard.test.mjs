import assert from 'node:assert/strict';
import {guardedSave,CloudSaveConflict,canonical,createOnlyAccount} from '../cloud-save-guard.mjs';
const base={plan:{0:[null,null,'rice',null]},custom:'[]',preferences:{food:'all'},servings:2};
function setup(current=structuredClone(base),u='A'){
 const writes=[];const reference={id:'A'};
 return {writes,reference,uid:'A',getUid:()=>u,confirmed:structuredClone(base),next:{...base,servings:3},runTransaction:async callback=>callback({get:async()=>({exists:()=>current!==null,data:()=>current}),set:(r,p)=>writes.push(p)})};
}
assert.equal(canonical({b:2,a:1}),canonical({a:1,b:2}));
let a=setup();await guardedSave(a);assert.equal(a.writes.length,1);assert.equal(a.writes[0].servings,3);
for(const changed of [{...base,plan:{}},{...base,custom:'[1]'},{...base,preferences:{}},{...base,otherNewData:true},null]){
 a=setup(changed);await assert.rejects(guardedSave(a),CloudSaveConflict);assert.equal(a.writes.length,0);
}
a=setup(structuredClone(base),'B');await assert.rejects(guardedSave(a),CloudSaveConflict);assert.equal(a.writes.length,0);
a=setup();a.confirmed=null;await assert.rejects(guardedSave(a),CloudSaveConflict);
console.log('Production-plan guarded-save simulations passed without cloud writes');

let fresh=setup(null);
let writes=[];
let created=await createOnlyAccount({runTransaction:async f=>f({get:async()=>({exists:()=>false}),set:(ref,value)=>writes.push(value)}),reference:fresh.reference,uid:'A',getUid:()=> 'A',initialDocument:base});
assert.equal(created.servings,2);
assert.equal(writes.length,1,'New account created exactly once');
writes=[];
await assert.rejects(createOnlyAccount({runTransaction:async f=>f({get:async()=>({exists:()=>true}),set:()=>writes.push(base)}),reference:fresh.reference,uid:'A',getUid:()=> 'A',initialDocument:base}),CloudSaveConflict);
assert.equal(writes.length,0,'Registration must not overwrite existing data');

let reset=setup({...base,retiredRecipes:['old'],staleSettings:{hidden:true}});
reset.confirmed={...base,retiredRecipes:['old'],staleSettings:{hidden:true}};
await guardedSave({...reset,next:{plan:{},preferences:{},goals:{}},replaceDocument:true});
assert.deepEqual(reset.writes[0],{plan:{},preferences:{},goals:{}},'Explicit reset removes old fields rather than merging');
reset=setup({...base,unrelated:'new data'});
await assert.rejects(guardedSave({...reset,next:{plan:{}},replaceDocument:true}),CloudSaveConflict);
assert.equal(reset.writes.length,0,'Conflicting reset must not delete newer changes');
