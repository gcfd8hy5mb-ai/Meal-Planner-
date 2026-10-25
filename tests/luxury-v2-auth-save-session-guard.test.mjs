import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const s=readFileSync(new URL('../luxury-v2/live.js', import.meta.url),'utf8');
assert.ok(s.includes('if(user&&accountUid===user.uid&&account){return;}'));
assert.ok(s.includes('Your new meal choice has NOT been saved'));
assert.ok(s.includes('archiveCompletedDraft(localStorage,uid,previous)'));
console.log('PASS authentication observer avoids resetting loaded account');
