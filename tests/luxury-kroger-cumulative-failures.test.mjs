import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('Kroger matching retains failure totals across successive batches',()=>{
 const source=readFileSync(new URL('../luxury-v2/live.js',import.meta.url),'utf8');
 assert.match(source,/let matchEpoch=0,matchQueue=\[\],matchPosition=0,matchFailures=0/);
 assert.match(source,/matchFailures=0;krogerMatchResults\.replaceChildren\(\)/);
 assert.match(source,/appendKrogerMatch\(item,\[\],\{failed:true\}\);matchFailures\+\+/);
 assert.match(source,/matchFailures\?' '\+matchFailures\+' Kroger lookups failed/);
 assert.doesNotMatch(source,/let failedLookups=0/);
});
