import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {groceryWeeksForScope} from '../luxury-v2/grocery-week-scope.mjs';
import {groceryTotals} from '../luxury-v2/groceries.mjs';
const live=readFileSync(new URL('../luxury-v2/live.js',import.meta.url),'utf8');
const lookup=id=>id==='dinner'?{ingredients:Array.from({length:25},(_,i)=>['Ingredient '+i,1,'each'])}:null;
const account={activePlanningWeek:1,mealTypes:['Dinner'],servings:1,plan:{0:[null,null,'dinner']},alternateWeek:{plan:{}}};
test('both weeks includes all 25 Week 1 ingredients even when Week 2 is empty',()=>{
 const counts=Object.fromEntries(['1','2','both'].map(scope=>[scope,groceryTotals(account,lookup,groceryWeeksForScope(scope)).length]));
 assert.deepEqual(counts,{'1':25,'2':0,'both':25});
});
test('both weeks combines weeks and does not duplicate shared ingredient names',()=>{
 account.alternateWeek.plan={1:[null,null,'dinner']};
 const combined=groceryTotals(account,lookup,groceryWeeksForScope('both'));
 assert.equal(combined.length,25);
 assert.equal(combined[0].quantity,2);
});
test('week count and expanded panel share the canonical scope resolver',()=>{
 assert.equal(live.split('groceryWeeksForScope(week)').length-1,2);
 assert.deepEqual(groceryWeeksForScope('invalid'),[]);
});
