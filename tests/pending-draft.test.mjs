import assert from 'node:assert/strict';
import {savePendingDraft,inspectPendingDraft} from '../pending-draft.mjs';
function storage(fails){const values=new Map([['tablewise-v1-A','old valid draft']]);const calls=[];return {values,calls,setItem(k,v){calls.push(k);if(k===fails)throw Error('quota unavailable');values.set(k,v)}}}
const next={plan:{0:['new']},custom:[{id:'meal'}]};
let s=storage();let r=savePendingDraft(s,'A',next);assert.equal(r.saved,true);assert.deepEqual(s.calls,['tablewise-pending-A','tablewise-v1-A']);assert.deepEqual(JSON.parse(s.values.get('tablewise-v1-A')),next);
assert.deepEqual(inspectPendingDraft(s.values.get('tablewise-pending-A'),s.values.get('tablewise-v1-A')),{pending:true,valid:true,legacy:false,mismatch:false});
s=storage('tablewise-pending-A');r=savePendingDraft(s,'A',next);assert.equal(r.saved,false);assert.deepEqual(s.calls,['tablewise-pending-A']);assert.equal(s.values.get('tablewise-v1-A'),'old valid draft');
s=storage('tablewise-v1-A');r=savePendingDraft(s,'A',next);assert.equal(r.saved,false);assert.equal(s.values.get('tablewise-v1-A'),'old valid draft');assert.equal(inspectPendingDraft(s.values.get('tablewise-pending-A'),s.values.get('tablewise-v1-A')).mismatch,true,'Old backup must never appear as current');
assert.equal(inspectPendingDraft('1',JSON.stringify(next)).legacy,true,'Legacy markers remain supported');
assert.equal(inspectPendingDraft('1',null).pending,true);
assert.equal(inspectPendingDraft('{bad}',JSON.stringify(next)).mismatch,true);
assert.equal(inspectPendingDraft(null,JSON.stringify(next)).pending,false);
console.log('Versioned marker and interrupted device-draft recovery tests passed');
