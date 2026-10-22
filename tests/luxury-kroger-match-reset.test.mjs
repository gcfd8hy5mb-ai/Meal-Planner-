import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('reset re-enables ingredient matching after aborted search',()=>{
 const source=readFileSync(new URL('../luxury-v2/live.js',import.meta.url),'utf8');
 const reset=source.match(/const resetKrogerMatches=\(\)=>\{[^}]+\}/)?.[0];
 assert.ok(reset);
 assert.match(reset,/\+\+matchEpoch/);
 assert.match(reset,/krogerMatchButton\.disabled=false/);
});
