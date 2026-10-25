// Transaction-ready adapter, deliberately NOT connected to a UI save button.
// The caller supplies the authenticated Firestore runTransaction and document ref.
// Only the two planning fields are updated; unrelated account data is preserved.
import {preparePlanPatch} from './save-guard.mjs';
import {previewAccount} from './meal-preview.mjs';
export class PlanConflictError extends Error {
  constructor(message){super(message);this.name='PlanConflictError'}
}
export async function savePreviewTransaction({runTransaction,documentRef,original,preview,getAuthenticatedUid}) {
  if(typeof runTransaction!=='function'||!documentRef||!original||!preview) throw Error('Missing transaction inputs');
  const intendedUid=getAuthenticatedUid?.();
  if(!intendedUid || documentRef.id!==intendedUid) throw Error('Authenticated account mismatch');
  return runTransaction(async transaction=>{
    if(getAuthenticatedUid?.()!==intendedUid) throw Error('Account changed before transaction read');
    const snapshot=await transaction.get(documentRef);
    if(!snapshot.exists()) throw new PlanConflictError('The saved plan is no longer available');
    const current=snapshot.data();
    const prepared=preparePlanPatch(original,current,preview,previewAccount);
    if(!prepared.ok) throw new PlanConflictError(prepared.reason);
    if(getAuthenticatedUid?.()!==intendedUid) throw Error('Account changed before transaction write');
    transaction.update(documentRef,prepared.fields);
    return {saved:true,savedFields:prepared.fields};
  });
}
