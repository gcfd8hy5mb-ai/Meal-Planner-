// Migration-ready transaction for the existing planner's whole-document save path.
// DO NOT connect to legacy UI until the branch is rebased onto current main.
// Compares the complete last confirmed cloud document and rejects stale writes.
const stable = value => {
  if(Array.isArray(value)) return value.map(stable);
  if(value && typeof value==='object' && Object.getPrototypeOf(value)===Object.prototype)
    return Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable(value[k])]));
  return value;
};
export const snapshotFingerprint = document => JSON.stringify(stable(document));
export class StaleDocumentError extends Error {
  constructor(){super('Your cloud plan was changed elsewhere. Reload to review changes before retrying.');this.name='StaleDocumentError'}
}
export async function guardedLegacySave({
  runTransaction,documentRef,lastConfirmedDocument,nextDocument,getAuthenticatedUid
}){
  if(typeof runTransaction!=='function'||!documentRef||!nextDocument)
    throw new Error('Invalid save inputs');
  const uid=getAuthenticatedUid?.();
  if(!uid||documentRef.id!==uid) throw new Error('Account mismatch before save');
  // Newly registered accounts must use a separate create-only path; never overwrite by assumption.
  if(!lastConfirmedDocument) throw new StaleDocumentError();
  const baseline=snapshotFingerprint(lastConfirmedDocument);
  return runTransaction(async tx=>{
    if(getAuthenticatedUid?.()!==uid) throw new Error('Account changed during save');
    const snap=await tx.get(documentRef);
    if(!snap.exists()) throw new StaleDocumentError();
    const current=snap.data();
    if(snapshotFingerprint(current)!==baseline) throw new StaleDocumentError();
    if(getAuthenticatedUid?.()!==uid) throw new Error('Account changed before write');
    // Merge within the verified existing document; use the current latest snapshot
    // to preserve any fields not represented in the local planner's state.
    const payload={...current,...nextDocument};
    tx.set(documentRef,payload);
    return {saved:true,confirmedDocument:payload};
  });
}
