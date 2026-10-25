import {compareRecoveredDinners} from './draft-comparison.mjs';
import {compareRecoverySettings} from './recovery-settings-diagnostic.mjs';
export function isVerifiedCompletedDraft(cloud,pending){
 if(!cloud||!pending||pending.unreadable||!pending.original||!pending.preview)return false;
 const differences=compareRecoverySettings(cloud,pending);
 return compareRecoveredDinners(cloud,pending).length===0 &&
  Array.isArray(differences) &&
  differences.every(item=>item==='Week 1 side dishes'||item==='Week 2 side dishes');
}
export function archiveCompletedDraft(storage,uid,pending){
 if(!uid||pending?.uid!==uid)throw Error('Recovery identity mismatch');
 const source='tablewise-luxury-pending-'+uid;
 const raw=storage.getItem(source);
 if(!raw||JSON.stringify(JSON.parse(raw))!==JSON.stringify(pending))throw Error('Device draft changed; backup retained');
 let key=null;
 for(let i=1;i<=1000;i++){
  const candidate='tablewise-luxury-verified-archive-'+uid+'-'+i;
  if(storage.getItem(candidate)===null){key=candidate;break}
 }
 if(!key)throw Error('Recovery archive capacity reached; backup retained');
 storage.setItem(key,raw);
 if(storage.getItem(key)!==raw)throw Error('Cannot verify archived backup');
 storage.removeItem(source);
 if(storage.getItem(source)!==null)throw Error('Old pending draft could not be cleared');
 return key;
}
