// Luxury-v2-only local checklist. Never modifies Firestore or a saved plan.
export const groceryKey = (row) => String(row.name).trim().toLowerCase()+'|'+String(row.unit||'').trim().toLowerCase();
export const checklistStorageKey = (uid,scope) => 'tablewise-luxury-v2-groceries:'+encodeURIComponent(uid)+':'+scope;
export function readChecklist(storage,uid,scope,rows) {
  if (!uid || !['both','1','2'].includes(String(scope))) return {};
  let saved={};try { saved=JSON.parse(storage.getItem(checklistStorageKey(uid,scope))||'{}') } catch {return {}}
  if (!saved || typeof saved!=='object' || Array.isArray(saved)) return {};
  const checked={};
  for(const row of rows) {
    const key=groceryKey(row),entry=saved[key];
    if(entry?.checked===true && Number(entry.quantity)===Number(row.quantity)) checked[key]=true;
  }
  return checked;
}
export function saveChecklist(storage,uid,scope,rows,checked) {
  if (!uid || !['both','1','2'].includes(String(scope))) return false;
  const saved={};
  for(const row of rows) {
    const key=groceryKey(row);
    if(checked[key]===true) saved[key]={quantity:row.quantity,checked:true};
  }
  try {storage.setItem(checklistStorageKey(uid,scope),JSON.stringify(saved));return true} catch {return false}
}
