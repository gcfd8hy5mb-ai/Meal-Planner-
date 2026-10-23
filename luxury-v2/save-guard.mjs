// Pure cloud-save preflight. Never imports UI or performs writes.
// Current production uses whole-document setDoc without a version field.
// A transaction must read and compare the original plan before applying edits.
// Firestore may return map fields in canonical key order instead of the user's
// original insertion order. Compare content, not JavaScript object-key order.
const canonicalize=value=>{
  if(Array.isArray(value))return value.map(canonicalize);
  if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonicalize(value[key])]));
  return value;
};
export function selectedPlanSnapshot(account) {
  if(!account || typeof account !== 'object') throw new Error('Plan not loaded');
  return JSON.stringify(canonicalize({
    plan:account.plan??null,
    alternateWeek:account.alternateWeek??null,
    activePlanningWeek:account.activePlanningWeek??1,
    mealServings:account.mealServings??null,
    dinnerSides:account.dinnerSides??null,
    servings:account.servings??null,
    mealTypes:account.mealTypes??null
  }));
}
export function checkPlanConflict(original,current) {
  if(!original || !current) return {ok:false,reason:'Plan unavailable'};
  return selectedPlanSnapshot(original)===selectedPlanSnapshot(current)
    ? {ok:true}
    : {ok:false,reason:'Saved plan changed in another session; reload before saving'};
}
export function preparePlanPatch(original,current,preview,applyPreview) {
  const guard=checkPlanConflict(original,current);
  if(!guard.ok) return {ok:false,reason:guard.reason};
  if(!preview || Object.keys(preview).length===0) return {ok:false,reason:'Nothing to save'};
  const updated=applyPreview(current,preview);
  // Include changed serving/side overrides so replaced dinners cannot retain old quantities.
  // Leave unrelated account fields untouched.
  const fields={plan:updated.plan,alternateWeek:updated.alternateWeek};
  for(const key of ['mealServings','dinnerSides']){
    if(JSON.stringify(updated[key]??{})!==JSON.stringify(current[key]??{})) fields[key]=updated[key]??{};
  }
  return {ok:true,fields};
}
