import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {groceryKey,readChecklist,saveChecklist} from '../luxury-v2/checklist.mjs';
import {groupGroceryItems} from '../luxury-v2/grocery-categories.mjs';
const js=readFileSync(new URL('../luxury-v2/live.js',import.meta.url),'utf8');
const storage=()=>{const d=new Map();return {getItem:k=>d.get(k)??null,setItem:(k,v)=>d.set(k,v)}};
test('week and account checkmarks do not leak between scopes',()=>{
 const db=storage(),items=[{name:'Milk',unit:'cup',quantity:2}];
 assert.equal(saveChecklist(db,'person-A','1',items,{[groceryKey(items[0])]:true}),true);
 assert.equal(readChecklist(db,'person-A','1',items)[groceryKey(items[0])],true);
 assert.deepEqual(readChecklist(db,'person-A','2',items),{});
 assert.deepEqual(readChecklist(db,'person-A','both',items),{});
 assert.deepEqual(readChecklist(db,'person-B','1',items),{});
});
test('changed grocery amount does not keep stale checks',()=>{
 const db=storage(),old=[{name:'Rice',unit:'cup',quantity:1}];
 saveChecklist(db,'person-A','1',old,{[groceryKey(old[0])]:true});
 assert.deepEqual(readChecklist(db,'person-A','1',[{...old[0],quantity:3}]),{});
});
test('category grouping never changes measured ingredients',()=>{
 const rows=[{name:'Milk',quantity:2,unit:'cup'},{name:'Carrot',quantity:3,unit:'each'},{name:'Beef',quantity:1,unit:'lb'}];
 const grouped=groupGroceryItems(rows).flatMap(([,items])=>items);
 assert.equal(grouped.length,rows.length);
 assert.deepEqual(grouped.map(x=>x.name).sort(),rows.map(x=>x.name).sort());
 assert.deepEqual(grouped.map(x=>x.quantity).sort(),rows.map(x=>x.quantity).sort());
});
test('recipe-only grocery display does not reset selected week',()=>{
 const start=js.indexOf("if(scope==='recipe'&&currentRecipe){"),end=js.indexOf('}else{host.hidden=true;',start);
 assert.ok(start>0&&end>start);
 assert.doesNotMatch(js.slice(start,end),/groceryOpenWeek\s*=\s*null/);
 assert.match(js,/restoreGroceryExpansion\(\);groceryOpenWeek=groceryExpansion\.week/);
});
