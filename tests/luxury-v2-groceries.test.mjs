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
