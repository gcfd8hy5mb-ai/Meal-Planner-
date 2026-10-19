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

// Synchronize the combined list with the actual weekly checklists. Keep each
// week's quantities independent when an ingredient occurs in both weeks.
export function readSyncedChecklist(storage,uid,scope,weekRows){
 const weeks=['1','2'];const rows=scope==='both'?[...weekRows['1'],...weekRows['2']]:weekRows[scope];
 const perWeek=Object.fromEntries(weeks.map(w=>[w,readChecklist(storage,uid,w,weekRows[w])]));
 const combinedLegacy=readChecklist(storage,uid,'both',[...weekRows['1'],...weekRows['2']]);
 const result={};
 for(const row of rows){const key=groceryKey(row);const owners=weeks.filter(w=>weekRows[w].some(x=>groceryKey(x)===key));
  if(scope==='both'){if(owners.length&&owners.every(w=>perWeek[w][key]===true))result[key]=true;}
  else if(perWeek[scope]?.[key])result[key]=true;
  else if(combinedLegacy[key]&&owners.length===1)result[key]=true;
 }
 return result;
}
export function saveSyncedChecklist(storage,uid,scope,weekRows,checked){
 const weeks=scope==='both'?['1','2']:[scope];
 let success=true;
 for(const week of weeks){const rows=weekRows[week];const current=readChecklist(storage,uid,week,rows);
  for(const row of rows){const key=groceryKey(row);if(Object.prototype.hasOwnProperty.call(checked,key))current[key]=!!checked[key];}
  if(!saveChecklist(storage,uid,week,rows,current))success=false;
 }
 return success;
}
