// Marker is written first, so a failed draft replacement can be detected at next login.
function signature(value){let hash=2166136261;for(let i=0;i<value.length;i++){hash^=value.charCodeAt(i);hash=Math.imul(hash,16777619)}return (hash>>>0).toString(16)+':'+value.length}
export function inspectPendingDraft(marker,draft){
 if(marker===null||marker===undefined)return {pending:false,valid:false,legacy:false,mismatch:false};
 if(marker==='1')return {pending:true,valid:typeof draft==='string',legacy:true,mismatch:false};
 try{const data=JSON.parse(marker);const valid=data?.format==='tablewise-pending-v2'&&typeof draft==='string'&&data.signature===signature(draft);return {pending:true,valid,legacy:false,mismatch:!valid}}catch{return {pending:true,valid:false,legacy:false,mismatch:true}}
}
export function savePendingDraft(storage,uid,payload){
 if(!uid)throw new Error('Missing account for draft backup');
 try{
  const serialized=JSON.stringify(payload);
  storage.setItem('tablewise-pending-'+uid,JSON.stringify({format:'tablewise-pending-v2',signature:signature(serialized)}));
  storage.setItem('tablewise-v1-'+uid,serialized);
  return {saved:true,error:null};
 }catch(error){return {saved:false,error}}
}
