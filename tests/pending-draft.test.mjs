import assert from 'node:assert/strict';
import {savePendingDraft} from '../pending-draft.mjs';
function storage(fails){const values=new Map([['tablewise-v1-A','old valid draft']]);const calls=[];return {values,calls,setItem(k,v){calls.push(k);if(k===fails)throw Error('quota unavailable');values.set(k,v)}}}
const next={plan:{0:['new']},custom:[{id:'meal'}]};
let s=storage();let r=savePendingDraft(s,'A',next);assert.equal(r.saved,true);assert.deepEqual(s.calls,['tablewise-pending-A','tablewise-v1-A']);assert.deepEqual(JSON.parse(s.values.get('tablewise-v1-A')),next);
s=storage('tablewise-pending-A');r=savePendingDraft(s,'A',next);assert.equal(r.saved,false);assert.deepEqual(s.calls,['tablewise-pending-A']);assert.equal(s.values.get('tablewise-v1-A'),'old valid draft','Failed marker write must not overwrite valid backup');
s=storage('tablewise-v1-A');r=savePendingDraft(s,'A',next);assert.equal(r.saved,false);assert.equal(s.values.get('tablewise-pending-A'),'1','Draft write failure must leave pending warning');assert.equal(s.values.get('tablewise-v1-A'),'old valid draft','Keep previous backup untouched');
console.log('Marker-first device draft tests passed');
