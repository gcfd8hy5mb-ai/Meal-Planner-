// Staged luxury-save integration. UI cloud writes remain disabled by release gate.
// The browser must preserve an exportable draft before attempting Firestore.
import {savePreviewTransaction} from './save-transaction.mjs';
const prefix='tablewise-luxury-pending-';
export const pendingKey=uid=>prefix+uid;
export function readPendingLuxuryDraft(storage,uid){
 if(!uid)return null;
 const raw=storage.getItem(pendingKey(uid));
 if(!raw)return null;
 try{
  const draft=JSON.parse(raw);
  return draft?.version===1&&draft.uid===uid&&draft.preview&&typeof draft.preview==='object'&&!Array.isArray(draft.preview)&&draft.original&&typeof draft.original==='object'?draft:{version:0,uid,unreadable:true};
 }catch{return {version:0,uid,unreadable:true}}
}
export async function commitLuxuryPreview({storage,uid,original,preview,runTransaction,documentRef,getAuthenticatedUid}){
 if(!uid||documentRef?.id!==uid||getAuthenticatedUid?.()!==uid)throw Error('Account changed before backup');
 if(!preview||!Object.keys(preview).length)throw Error('No edits to save');
 const existing=readPendingLuxuryDraft(storage,uid);
 if(existing)throw Error('An unsaved luxury draft already exists. Review or export it before another save.');
 const payload={version:1,uid,original,preview};
 // A local backup failure must prevent a cloud write.
 try{storage.setItem(pendingKey(uid),JSON.stringify(payload))}
 catch(e){throw new Error('Could not back up edits to this device. Nothing was sent to the cloud.',{cause:e})}
 let result;
 try{result=await savePreviewTransaction({runTransaction,documentRef,original,preview,getAuthenticatedUid})}
 catch(e){throw e} // Keep backup for recovery/export on failure.
 // If cleanup fails, retain the recoverable copy and surface a warning.
 try{storage.removeItem(pendingKey(uid))}
 catch(e){return {...result,cleanupWarning:'Saved to cloud, but device backup cleanup failed.',confirmed: false}}
 return {...result,confirmed:true};
}
