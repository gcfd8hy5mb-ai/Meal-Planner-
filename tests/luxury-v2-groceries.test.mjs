import assert from 'node:assert/strict';
import { groceryTotals } from '../luxury-v2/groceries.mjs';
const recipes=new Map([['meal',{id:'meal',ingredients:[['Rice',1,'cup'],['Salt',0.5,'tsp']]}]]);
const lookup=id=>recipes.get(id);
const account={
 activePlanningWeek:1,servings:2,mealTypes:['Dinner'],
 plan:{0:[null,null,'meal',null]},mealServings:{},dinnerSides:{0:['mashedpotatoes']},
 alternateWeek:{plan:{1:[null,null,'meal',null]},mealServings:{'1-2':3},dinnerSides:{}}
};
const rows=groceryTotals(account,lookup,[1,2]);
const find=(name,unit)=>rows.find(r=>r.name===name&&r.unit===unit)?.quantity;
assert.equal(find('Rice','cup'),5,'Both saved weeks and serving override must combine');
assert.equal(find('Salt','tsp'),2.5,'Recipe ingredient quantities multiply by servings');
assert.equal(find('Potatoes','cup'),2,'Saved dinner side contributes ingredients');
assert.equal(groceryTotals(account,lookup,[1]).find(x=>x.name==='Rice')?.quantity,2,'Week filter works');
assert.deepEqual(groceryTotals(null,lookup,[1,2]),[],'Signed-out state has no phantom groceries');
account.mealTypes=['Lunch'];
assert.deepEqual(groceryTotals(account,lookup,[1,2]),[],'Unselected meal slots do not contribute');
console.log('Two-week luxury grocery aggregation checks passed');

// The plan may store Week 2 as active, with Week 1 in alternateWeek.
account.mealTypes=['Dinner'];
account.activePlanningWeek=2;
account.plan={1:[null,null,'meal',null]};
account.mealServings={'1-2':3};
account.dinnerSides={};
account.alternateWeek={plan:{0:[null,null,'meal',null]},mealServings:{},dinnerSides:{0:['mashedpotatoes']}};
assert.equal(groceryTotals(account,lookup,[1]).find(x=>x.name==='Rice')?.quantity,2, 'Inactive Week 1 must map to alternate bundle');
assert.equal(groceryTotals(account,lookup,[2]).find(x=>x.name==='Rice')?.quantity,3, 'Active Week 2 must map to current bundle');
assert.equal(groceryTotals(account,lookup,[1,2]).find(x=>x.name==='Rice')?.quantity,5, 'Both weeks must combine regardless of which is active');

const repeatedWeeks=groceryTotals(account,lookup,[1,1,2,2]);
assert.equal(repeatedWeeks.find(x=>x.name==='Rice')?.quantity,5,'Duplicate week filters must not double grocery quantities');
assert.equal(groceryTotals(account,lookup,[0,3]).length,0,'Invalid weeks must not silently include alternate week');
assert.equal(groceryTotals(account,lookup,[2,2]).find(x=>x.name==='Rice')?.quantity,3,'Week 2 may be selected repeatedly without doubling');
const repeatAccount={
 activePlanningWeek:1,servings:2,mealTypes:['Dinner'],
 plan:{0:[null,null,'meal',null],1:[null,null,'meal',null]},
 mealServings:{'1-2':4},dinnerSides:{0:['mashedpotatoes'],1:['mashedpotatoes']},
 alternateWeek:{plan:{0:[null,null,'meal',null]},mealServings:{'0-2':3},dinnerSides:{0:['mashedpotatoes']}}
};
const repeatRows=groceryTotals(repeatAccount,lookup,[1,2]);
assert.equal(repeatRows.find(x=>x.name==='Rice')?.quantity,9,'Repeated meals sum quantities across dates and both weeks');
assert.equal(repeatRows.find(x=>x.name==='Potatoes')?.quantity,9,'Sides repeat with their parent meal servings');
assert.equal(repeatRows.find(x=>x.name==='Salt')?.quantity,4.5,'Fractional ingredient units multiply with per-meal servings');
