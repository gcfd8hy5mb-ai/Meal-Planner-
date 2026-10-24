import {previewAccount} from './meal-preview.mjs';
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const equal=(a,b)=>JSON.stringify(canonical(a??null))===JSON.stringify(canonical(b??null));
const week=(a,n)=>(a.activePlanningWeek===2?2:1)===n?a:a.alternateWeek??{};
export function compareRecoverySettings(cloud,pending){
 if(!cloud||!pending?.original||!pending.preview)return null;
 const desired=previewAccount(pending.original,pending.preview);
 const differences=[];
 const check=(name,a,b)=>{if(!equal(a,b))differences.push(name)};
 for(const n of [1,2]){
  const a=week(cloud,n),b=week(desired,n);
  for(const [label,key] of [['meals','plan'],['serving quantities','mealServings'],['side dishes','dinnerSides'],['grocery quantities','groceryQuantities'],['grocery checkmarks','checked'],['grocery overrides','groceryOverrides'],['grocery updates','groceryUpdates'],['manual groceries','manualGroceries']])check('Week '+n+' '+label,a[key],b[key]);
 }
 for(const [label,key] of [['active week','activePlanningWeek'],['household servings','servings'],['meal types','mealTypes'],['food preferences','preferences'],['nutrition goals','goals'],['pantry','pantry'],['custom recipes','custom']])check(label,cloud[key],desired[key]);
 return differences;
}
