// Compare two saved planner states without modifying either account or storage.
const rows=account=>{
 const active=account?.activePlanningWeek===2?2:1;
 const first=active===1?account?.plan:account?.alternateWeek?.plan;
 const second=active===2?account?.plan:account?.alternateWeek?.plan;
 const get=(plan,day)=>Array.isArray(plan?.[day])?plan[day][2]??null:null;
 return Array.from({length:14},(_,i)=>({week:i<7?1:2,day:i%7,meal:get(i<7?first:second,i%7)}));
};
export function compareRecoveredDinners(cloud,pending){
 if(!cloud||!pending?.original||!pending?.preview)return [];
 const desired=(()=>{const active=pending.original.activePlanningWeek===2?2:1;const copy=structuredClone(pending.original);for(const [key,value] of Object.entries(pending.preview)){const [week,day,slot]=key.split('-').map(Number);if(slot!==2||![1,2].includes(week)||day<0||day>6)continue;const target=week===active?copy:(copy.alternateWeek??={plan:{}});target.plan??={};const row=[...(target.plan[day]??[null,null,null,null])];row[2]=value;target.plan[day]=row;}return copy;})();
 const a=rows(cloud),b=rows(desired);
 return a.map((item,i)=>({...item,deviceMeal:b[i].meal})).filter(x=>x.meal!==x.deviceMeal);
}
