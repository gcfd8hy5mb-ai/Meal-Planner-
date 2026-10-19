import test from 'node:test';import assert from 'node:assert/strict';import {sortKrogerIngredientMatches} from '../luxury-v2/kroger-pricing.mjs';
test('ingredient description outranks unrelated discounts',()=>{
 const products=[{name:'Chicken flavored crackers',regular:5,promo:3},{name:'Boneless chicken breast',regular:7},{name:'Chicken breast fillets',regular:6,promo:5}];
 const ranked=sortKrogerIngredientMatches('Chicken breast',products);
 assert.equal(ranked[0].name,'Chicken breast fillets');
 assert.equal(ranked[1].name,'Boneless chicken breast');
});
test('equal relevance uses verified savings',()=>{
 const products=[{name:'Whole milk',regular:5},{name:'Whole milk',regular:5,promo:4}];
 assert.equal(sortKrogerIngredientMatches('Whole milk',products)[0].promo,4);
});
test('missing response safely produces no candidates',()=>{assert.deepEqual(sortKrogerIngredientMatches('milk',null),[])});
