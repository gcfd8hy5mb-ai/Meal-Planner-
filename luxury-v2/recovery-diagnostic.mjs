// Pure, read-only diagnostic of the signed-in account's saved meal structure.
// Deliberately returns counts/statuses only: no UID, email, recipe IDs or private data.
const validObject=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const countWeek=plan=>{
 if(!validObject(plan))return {days:0,meals:0,empty:0,valid:false};
 let days=0,meals=0,empty=0;
 for(const row of Object.values(plan)){
  if(!Array.isArray(row))return {days,meals,empty,valid:false};
  days++;
  for(const item of row){if(typeof item==='string'&&item.trim())meals++;else if(item===null||item==='')empty++;}
 }
 return {days,meals,empty,valid:true};
};
export function diagnoseSavedPlan(data){
 if(!validObject(data))return {document:'missing',preferences:'unknown',week1:countWeek(null),week2:countWeek(null),recovery:'Account document unavailable'};
 const preferences=data.preferences===null?'null':!Object.hasOwn(data,'preferences')?'missing':validObject(data.preferences)?'present':'invalid';
 const week1=countWeek(data.plan);
 const week2=countWeek(data.alternateWeek?.plan);
 const initialized=data.onboardingInitialized===true;
 return {document:'present',preferences,initialized,week1,week2,
   recovery:preferences!=='present'&&!initialized?'Preferences need inspection; do not reset or overwrite your saved data.':'No missing-preferences warning from the original app guard.'};
}
