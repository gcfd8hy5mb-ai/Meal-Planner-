// Pure, deterministic candidate generation for future calendar renewal.
// Does not write Firebase or replace any saved meal.
export function generateRenewalCandidates(account,recipes) {
 if(!account?.plan||!account?.alternateWeek?.plan)throw Error('Existing saved weeks required');
 const available=(recipes||[]).filter(r=>r&&typeof r.id==='string'&&r.id&&r.name&&r.slot==='Dinner'&&Array.isArray(r.ingredients)&&r.ingredients.length&&Array.isArray(r.steps)&&r.steps.length);
 const unique=[...new Map(available.map(r=>[r.id,r])).values()];
 if(unique.length<14)throw Error('At least 14 complete, distinct recipes are required');
 const previous=new Set([account.plan,account.alternateWeek.plan].flatMap(plan=>Array.from({length:7},(_,i)=>plan?.[i]?.[2]).filter(Boolean)));
 const preferred=unique.filter(r=>!previous.has(r.id));
 const selected=(preferred.length>=14?preferred:unique).slice().sort((a,b)=>a.id.localeCompare(b.id)).slice(0,14);
 if(selected.length!==14)throw Error('Cannot generate 14 different dinners');
 const makeWeek=(offset,base)=>Object.fromEntries(Array.from({length:7},(_,i)=>{const row=Array.isArray(base?.[i])?[...base[i]]:[null,null,null,null];row[2]=selected[offset+i].id;return [i,row]}));
 const active=account.activePlanningWeek===2?2:1;const first=active===1?account.plan:account.alternateWeek.plan;const second=active===1?account.alternateWeek.plan:account.plan;
 return {week1:makeWeek(0,first),week2:makeWeek(7,second),selectedIds:selected.map(r=>r.id),repeatedFromPrevious:selected.some(r=>previous.has(r.id))};
}
