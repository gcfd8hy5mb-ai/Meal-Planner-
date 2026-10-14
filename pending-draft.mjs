// Write the pending marker before replacing a recoverable draft.
// On failure, do not proceed to a cloud write: the user must export the in-memory draft.
export function savePendingDraft(storage,uid,payload){
 if(!uid)throw new Error('Missing account for draft backup');
 try{
  storage.setItem('tablewise-pending-'+uid,'1');
  storage.setItem('tablewise-v1-'+uid,JSON.stringify(payload));
  return {saved:true,error:null};
 }catch(error){return {saved:false,error}}
}
