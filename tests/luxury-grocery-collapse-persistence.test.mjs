import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../luxury-v2/live.js',import.meta.url),'utf8');
test('grocery lists default closed and expansion restored after account load',()=>{
 assert.match(source,/let groceryOpenWeek=null/);
 assert.match(source,/account=loaded;accountUid=user.uid;restoreGroceryExpansion\(\);groceryOpenWeek=groceryExpansion.week/);
});
test('category expansion is per week and persisted by user',()=>{
 assert.match(source,/tablewise:grocery-expanded:v1:/);
 assert.match(source,/categories\[week\]\?\.\[category\]\?\?false/);
 assert.match(source,/groceryExpansion\.categories\[week\]/);
 assert.match(source,/saveGroceryExpansion\(\)/);
});
test('synchronized Week 1, Week 2 and Both checklist persists without cross-account mixing',()=>{
 assert.match(source,/readSyncedChecklist\(localStorage,accountUid,week,weekRows\)/);
 assert.match(source,/saveSyncedChecklist\(localStorage,accountUid,week,weekRows,checks\)/);
 assert.match(source,/const weekRows=\{'1':groceryTotals\(effectiveAccount\(\),findRecipe,\[1\]\),'2':groceryTotals\(effectiveAccount\(\),findRecipe,\[2\]\)\}/);
});
