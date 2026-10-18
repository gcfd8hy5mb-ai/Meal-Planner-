import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../luxury-v2/live.js',import.meta.url),'utf8');
test('Kroger connection error messages are scoped to the active account',()=>{
 assert.match(source,/catch\(error\)\{if\(auth\.currentUser\?\.uid===user\.uid\)krogerDisplay\(error\.message\|\|'Unable to start Kroger connection\.'/);
 assert.match(source,/catch\(error\)\{if\(auth\.currentUser\?\.uid===user\.uid\)krogerDisplay\(error\.message\|\|'Could not disconnect Kroger\.'/);
});
