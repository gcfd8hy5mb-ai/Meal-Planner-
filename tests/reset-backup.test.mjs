import assert from 'node:assert/strict';
import {clearResetBackup} from '../reset-backup.mjs';
function storage(failKey){const values=new Map([['tablewise-pending-A','1'],['tablewise-v1-A','{\"plan\":{}}']]);const calls=[];return {values,calls,removeItem(key){calls.push(key);if(key===failKey)throw Error('storage unavailable');values.delete(key)}}}
let s=storage();let result=clearResetBackup(s,'A');assert.deepEqual(result,{pendingCleared:true,draftCleared:true,error:null});assert.deepEqual(s.calls,['tablewise-pending-A','tablewise-v1-A']);assert.equal(s.values.size,0);
s=storage('tablewise-pending-A');result=clearResetBackup(s,'A');assert.equal(result.pendingCleared,false);assert.equal(result.draftCleared,false);assert.deepEqual(s.calls,['tablewise-pending-A']);assert.equal(s.values.has('tablewise-v1-A'),true,'Recoverable draft must survive failed marker removal');
s=storage('tablewise-v1-A');result=clearResetBackup(s,'A');assert.equal(result.pendingCleared,true);assert.equal(result.draftCleared,false);assert.equal(s.values.has('tablewise-pending-A'),false,'Stale backup cannot lock next login after marker removal');assert.equal(s.values.has('tablewise-v1-A'),true,'Unread stale draft is left untouched');
console.log('Reset backup partial-storage-failure tests passed');
