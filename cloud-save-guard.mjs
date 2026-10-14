// Save only after confirming the complete server document is unchanged.
// This module has no dependency on the legacy or luxury presentation.
export const canonical=(value)=>JSON.stringify(sort(value));
function sort(value){if(Array.isArray(value))return value.map(sort);if(value&&typeof value==='object'&&Object.getPrototypeOf(value)===Object.prototype)return Object.fromEntries(Object.keys(value).sort().map(k=>[k,sort(value[k])]));return value}
export class CloudSaveConflict extends Error{constructor(){super('Another session changed your cloud data. Your edits remain on this device. Reload and review before retrying.');this.name='CloudSaveConflict'}}
export async function guardedSave({runTransaction,reference,confirmed,next,uid,getUid}){
 if(!uid||reference?.id!==uid||getUid()!==uid||!confirmed)throw new CloudSaveConflict();
 const expected=canonical(confirmed);
 return runTransaction(async tx=>{
  if(getUid()!==uid)throw new CloudSaveConflict();
  const doc=await tx.get(reference);
  if(!doc.exists()||canonical(doc.data())!==expected)throw new CloudSaveConflict();
  if(getUid()!==uid)throw new CloudSaveConflict();
  const payload={...doc.data(),...next};
  tx.set(reference,payload);
  return payload;
 });
}

export async function createOnlyAccount({runTransaction,reference,uid,getUid,initialDocument}){
 if(!uid||reference?.id!==uid||getUid()!==uid)throw new CloudSaveConflict();
 return runTransaction(async tx=>{
   if(getUid()!==uid)throw new CloudSaveConflict();
   const snapshot=await tx.get(reference);
   if(snapshot.exists()||getUid()!==uid)throw new CloudSaveConflict();
   tx.set(reference,initialDocument);
   return initialDocument;
 });
}
