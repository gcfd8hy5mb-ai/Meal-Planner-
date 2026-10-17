import test from 'node:test';import assert from 'node:assert/strict';import {suggestedKrogerPackages as packages} from '../luxury-v2/kroger-packages.mjs';
test('whole package count for comparable masses',()=>{assert.equal(packages({quantity:3,unit:'lb'},'1 lb'),3);assert.equal(packages({quantity:24,unit:'oz'},'1 lb'),2);assert.equal(packages({quantity:2,unit:'lb'},'32 oz'),1)});
test('unknown or mismatched sizes require manual review',()=>{assert.equal(packages({quantity:3,unit:'lb'},'Family Pack'),null);assert.equal(packages({quantity:3,unit:'cup'},'12 oz'),null);assert.equal(packages({quantity:1,unit:'each'},'12 oz'),null)});
test('countable units and upper safety limit',()=>{assert.equal(packages({quantity:6,unit:'each'},'2 ct'),3);assert.equal(packages({quantity:100,unit:'each'},'1 ct'),null)});

test('zero-size packages and incompatible unit sizes require manual review',()=>{
 assert.equal(packages({quantity:2,unit:'lb'},'0 lb'),null);
 assert.equal(packages({quantity:2,unit:'lb'},'2 fl oz'),null);
 assert.equal(packages({quantity:1,unit:'each'},'2 lb'),null);
});

test('common recipe unit aliases match unambiguous retail package sizes',()=>{
 assert.equal(packages({quantity:3,unit:'lbs'},'1 lb'),3);
 assert.equal(packages({quantity:24,unit:'ounces'},'16 oz'),2);
 assert.equal(packages({quantity:6,unit:'pieces'},'2 ct'),3);
 assert.equal(packages({quantity:2,unit:'cups'},'16 fl oz'),null);
});
