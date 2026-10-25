import {compareRecoverySettings} from './recovery-settings-diagnostic.mjs';
import {compareRecoveredDinners} from './draft-comparison.mjs';
export function sideDishOnlyRecovery(cloud,pending){
 const differences=compareRecoverySettings(cloud,pending);
 return Array.isArray(differences)&&differences.length===1&&differences[0]==='Week 1 side dishes'&&compareRecoveredDinners(cloud,pending).length===0;
}
// This function never modifies Firebase. An archive is retained even after dismissing
// the pending warning; never overwrite an existing archive.
export function archiveVerifiedSideDraft(storage,uid,pending){
 if(!uid||pending?.uid!==uid||pending?.unreadable)throw Error('Draft identity not verified');
 const key='tablewise-luxury-side-recovery-archive-'+uid;
 if(storage.getItem(key))throw Error('An earlier archive already exists. Export it before clearing another warning.');
 const source='tablewise-luxury-pending-'+uid;
 const raw=storage.getItem(source);
 if(!raw||JSON.stringify(JSON.parse(raw))!==JSON.stringify(pending))throw Error('Device draft changed. Review it again.');
 storage.setItem(key,raw);
 if(storage.getItem(key)!==raw)throw Error('Could not verify device archive');
 storage.removeItem(source);
 return true;
}

/** Strict recovery of the user-confirmed Wednesday dinner:
 * Week 1 Wednesday must be the ONLY changed dinner; all other saved settings
 * except Week 1 sides must match. Firebase is never modified.
 */
export function confirmedWednesdayCloudRecovery(cloud,pending,keepRecipeId){
 if(!keepRecipeId||!pending?.original)return false;
 const changed=compareRecoveredDinners(cloud,pending);
 const differences=compareRecoverySettings(cloud,pending);
 return changed.length===1&&changed[0].week===1&&changed[0].day===3
  &&changed[0].meal===keepRecipeId
  &&Array.isArray(differences)
  &&differences.every(x=>x==='Week 1 meals'||x==='Week 1 side dishes')
  &&differences.includes('Week 1 meals');
}
