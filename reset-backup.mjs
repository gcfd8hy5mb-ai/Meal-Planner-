// After cloud reset commits, never discard a recoverable draft while its pending marker remains.
// The marker is removed first; if that fails, preserve the draft for safe review.
export function clearResetBackup(storage,uid){
 const pendingKey='tablewise-pending-'+uid,draftKey='tablewise-v1-'+uid;
 try{storage.removeItem(pendingKey)}catch(error){return {pendingCleared:false,draftCleared:false,error}}
 try{storage.removeItem(draftKey)}catch(error){return {pendingCleared:true,draftCleared:false,error}}
 return {pendingCleared:true,draftCleared:true,error:null};
}
