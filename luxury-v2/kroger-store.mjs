const key=uid=>'tablewise:kroger-store:v1:'+uid;
export const validKrogerStore=id=>typeof id==='string'&&/^\d{8}$/.test(id);
export function readKrogerStore(storage,uid){
 if(!uid)return null;
 try{const record=JSON.parse(storage.getItem(key(uid))||'null');return validKrogerStore(record?.id)&&typeof record.label==='string'&&record.label.length<200?record:null}catch{return null}
}
export function saveKrogerStore(storage,uid,record){
 if(!uid||!validKrogerStore(record?.id)||typeof record.label!=='string'||record.label.length>200)return false;
 try{storage.setItem(key(uid),JSON.stringify({id:record.id,label:record.label,zip:typeof record.zip==='string'&&/^\d{5}$/.test(record.zip)?record.zip:''}));return true}catch{return false}
}
