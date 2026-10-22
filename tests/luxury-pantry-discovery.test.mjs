import test from 'node:test';
import assert from 'node:assert/strict';
import {ingredientTokens,matchPantry} from '../luxury-v2/pantry-discovery.mjs';
import {readFileSync} from 'node:fs';
const recipes=[
 {id:'a',name:'Chicken Taco',cuisine:'Mexican',ingredients:[['Chicken',1,'lb'],['Tomato',1,'each'],['Cheese',1,'cup']]},
 {id:'b',name:'Pasta Bake',cuisine:'Italian',ingredients:[['Pasta',1,'cup'],['Tomato',1,'each']]},
 {id:'c',name:'Chicken Soup',cuisine:'American',ingredients:[['Chicken',1,'lb'],['Broth',1,'cup']]}
];
test('normalizes and deduplicates typed pantry ingredients',()=>assert.deepEqual(ingredientTokens(' Chicken, Tomatoes, chicken; Cheese '),['chicken','tomato','cheese']));
test('cuisine and missing ingredient filters are applied together',()=>{
 const exact=matchPantry(recipes,'chicken, tomatoes, cheese',{type:'Mexican',maxMissing:0});
 assert.equal(exact.length,1);assert.equal(exact[0].recipe.id,'a');assert.deepEqual(exact[0].missing,[]);
 assert.equal(matchPantry(recipes,'chicken',{type:'Mexican',maxMissing:1}).length,0);
 assert.equal(matchPantry(recipes,'chicken',{type:'Mexican',maxMissing:2}).length,1);
});
test('search is deterministic and never manufactures external recipes',()=>{
 assert.deepEqual(matchPantry(recipes,'',{}),[]);
 assert.equal(matchPantry(recipes,'chicken',{type:'Soups',maxMissing:1})[0]?.recipe.id,'c');
});
test('UI keeps search separate from account saves and uses safe DOM text',()=>{
 const html=readFileSync(new URL('../luxury-v2/index.html',import.meta.url),'utf8');
 const js=readFileSync(new URL('../luxury-v2/live.js',import.meta.url),'utf8');
 assert.match(html,/id="pantryDiscoverToggle"/);
 assert.match(html,/id="pantryCuisine"/);
 assert.match(js,/matchPantry\(recipes,pantry/);
 assert.match(js,/detail\.textContent=/);
 assert.doesNotMatch(js.slice(js.indexOf('const pantryPanel='),js.indexOf('const firebaseConfig=')),/runTransaction|localStorage\.setItem/);
});
