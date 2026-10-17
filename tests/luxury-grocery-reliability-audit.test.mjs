import test from 'node:test';import assert from 'node:assert/strict';import {groceryTotals} from '../luxury-v2/groceries.mjs';import {groupGroceryItems,groceryCategory} from '../luxury-v2/grocery-categories.mjs';import {groceryKey,readChecklist,saveChecklist} from '../luxury-v2/checklist.mjs';
const makeStorage=()=>{const data=new Map();return {getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value)}};
const menu=new Map([['a',{ingredients:[['Milk',1,'cup'],['Broccoli',2,'each']]}],['b',{ingredients:[['Milk',2,'cup'],['Chicken',1,'lb']]}]]);
const lookup=id=>menu.get(id);
const account={mealTypes:['Dinner'],servings:1,activePlanningWeek:1,plan:Array.from({length:7},(_,i)=>i===0?[null,null,'a',null]:[]),alternateWeek:{plan:Array.from({length:7},(_,i)=>i===0?[null,null,'b',null]:[])}};
test('both weeks exactly equals summed separate weeks without double counting',()=>{
 const one=groceryTotals(account,lookup,[1]),two=groceryTotals(account,lookup,[2]),both=groceryTotals(account,lookup,[1,2]);
 const milk=rows=>rows.find(x=>x.name==='Milk')?.quantity||0;
 assert.equal(milk(one),1);assert.equal(milk(two),2);assert.equal(milk(both),3);
 assert.deepEqual(groceryTotals(account,lookup,[1,1]),one);
 assert.equal(both.length,3);
 const groups=groupGroceryItems(both);assert.equal(groups.flatMap(x=>x[1]).length,both.length);
});
test('checkmarks survive switching weeks, stay account-scoped, and invalidate on quantity change',()=>{
 const store=makeStorage(),one=groceryTotals(account,lookup,[1]),two=groceryTotals(account,lookup,[2]);
 assert.equal(saveChecklist(store,'userA','1',one,{[groceryKey(one[0])]:true}),true);
 assert.equal(Object.values(readChecklist(store,'userA','1',one)).filter(Boolean).length,1);
 assert.deepEqual(readChecklist(store,'userA','2',two),{});
 assert.deepEqual(readChecklist(store,'userB','1',one),{});
 const changed=one.map(x=>({...x,quantity:x.quantity+1}));
 assert.deepEqual(readChecklist(store,'userA','1',changed),{});
});
test('category grouping handles real grocery names, not substring collisions',()=>{
 assert.equal(groceryCategory('Ice cream'),'Frozen');
 assert.equal(groceryCategory('Ground black pepper'),'Pantry & Dry Goods');
 assert.equal(groceryCategory('Coconut milk'),'Pantry & Dry Goods');
 assert.equal(groceryCategory('Bell pepper'),'Produce');
 assert.equal(groceryCategory('Chicken breast'),'Meat & Seafood');
});
