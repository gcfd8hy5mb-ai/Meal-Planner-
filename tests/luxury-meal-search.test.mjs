import test from 'node:test';
import assert from 'node:assert/strict';
import {searchMeals,mealCategories} from '../luxury-v2/meal-search.mjs';
const meals=[
 {id:'f',name:'Chicken Fajitas',slot:'Dinner',cuisine:'Tex-Mex',ingredients:[['Chicken breast',5,'oz'],['Pepper',1,'each']]},
 {id:'b',name:'Beef Tacos',slot:'Dinner',cuisine:'Mexican',ingredients:[['Ground beef',5,'oz']]},
 {id:'s',name:'Salmon Supper',slot:'Dinner',cuisine:'American',ingredients:[['Salmon',6,'oz']]},
 {id:'p',name:'Chicken Pasta',slot:'Dinner',cuisine:'Italian',ingredients:[['Chicken breast',5,'oz'],['Penne',3,'oz']]},
 {id:'l',name:'Chicken Salad Lunch',slot:'Lunch',cuisine:'American',ingredients:[['Chicken',4,'oz']]}
];
const ids=(query,category='All')=>searchMeals(meals,{query,category}).map(m=>m.id);
test('meal search understands cuisines, proteins, and ingredient keywords',()=>{
 assert.deepEqual(ids('mexican'),['b','f']);
 assert.deepEqual(ids('chicken'),['f','p']);
 assert.deepEqual(ids('beef'),['b']);
 assert.deepEqual(ids('penne'),['p']);
 assert.deepEqual(ids('CHICKEN PASTA'),['p']);
 assert.deepEqual(ids('', 'Seafood'),['s']);
 assert.deepEqual(ids('', 'Mexican'),['b','f']);
 assert.deepEqual(ids('chicken','Mexican'),['f']);
 assert.ok(mealCategories.includes('All')&&mealCategories.includes('Southern'));
 assert.ok(!ids('chicken').includes('l'));
});
