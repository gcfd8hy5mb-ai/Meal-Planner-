import assert from 'node:assert/strict';
import {test} from 'node:test';
import {groceryKey,readSyncedChecklist,saveSyncedChecklist} from './checklist.mjs';
const store=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)}};
const apple={name:'Apple',unit:'each',quantity:2},milk={name:'Milk',unit:'cup',quantity:1},rice={name:'Rice',unit:'cup',quantity:3};
const weeks={'1':[apple,milk],'2':[apple,rice]};
test('both-week checks propagate to each week and uncheck both ways',()=>{
 const storage=store(),key=groceryKey(apple);
 assert.equal(saveSyncedChecklist(storage,'user-a','both',weeks,{[key]:true}),true);
 assert.equal(readSyncedChecklist(storage,'user-a','1',weeks)[key],true);
 assert.equal(readSyncedChecklist(storage,'user-a','2',weeks)[key],true);
 assert.equal(readSyncedChecklist(storage,'user-a','both',weeks)[key],true);
 saveSyncedChecklist(storage,'user-a','1',weeks,{[key]:false});
 assert.equal(readSyncedChecklist(storage,'user-a','both',weeks)[key],undefined);
 assert.equal(readSyncedChecklist(storage,'user-a','2',weeks)[key],true);
 saveSyncedChecklist(storage,'user-a','both',weeks,{[key]:false});
 assert.equal(readSyncedChecklist(storage,'user-a','2',weeks)[key],undefined);
});
test('unrelated checks survive changes and accounts are isolated',()=>{
 const storage=store();saveSyncedChecklist(storage,'user-a','1',weeks,{[groceryKey(milk)]:true});
 saveSyncedChecklist(storage,'user-a','both',weeks,{[groceryKey(apple)]:true});
 assert.equal(readSyncedChecklist(storage,'user-a','1',weeks)[groceryKey(milk)],true);
 assert.equal(readSyncedChecklist(storage,'user-b','1',weeks)[groceryKey(milk)],undefined);
});
