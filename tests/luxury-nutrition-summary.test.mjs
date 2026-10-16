import test from 'node:test';
import assert from 'node:assert/strict';
import {nutritionForDay} from '../luxury-v2/nutrition.mjs';
const recipes=new Map([['a',{cal:300,p:20,c:35,f:8}],['b',{cal:420,p:30,c:50,f:12}]]);
const lookup=id=>recipes.get(id);
test('daily nutrition totals track servings, substitutions, and enabled meal types',()=>{
 const account={servings:2,mealTypes:['Breakfast','Dinner'],plan:{0:['a',null,'b',null]},mealServings:{'0-2':3}};
 assert.deepEqual(nutritionForDay(account,lookup,0),{cal:1860,p:130,c:220,f:52,meals:2});
 account.plan[0][2]='a';
 assert.equal(nutritionForDay(account,lookup,0).cal,1500);
 account.mealTypes=['Dinner'];
 assert.equal(nutritionForDay(account,lookup,0).cal,900);
 account.mealServings['0-2']=1;
 assert.equal(nutritionForDay(account,lookup,0).cal,300);
 account.plan[0][2]=null;
 assert.equal(nutritionForDay(account,lookup,0).cal,0);
 assert.equal(nutritionForDay(null,lookup,0).meals,0);
 assert.equal(nutritionForDay(account,lookup,9).meals,0);
});
