export function nutritionForDay(account,lookup,day){
 const empty={cal:0,p:0,c:0,f:0,meals:0};
 if(!account||!Number.isInteger(day)||day<0||day>6)return empty;
 const plan=account.plan?.[day];if(!Array.isArray(plan))return empty;
 const allowed=Array.isArray(account.mealTypes)&&account.mealTypes.length?new Set(account.mealTypes):null;
 const slots=['Breakfast','Lunch','Dinner','Snack'];
 const total={...empty};
 for(let slot=0;slot<4;slot++){
  if(allowed&&!allowed.has(slots[slot]))continue;
  const recipe=lookup(plan[slot]);if(!recipe)continue;
  const override=Number(account.mealServings?.[day+'-'+slot]);
  const fallback=Number(account.servings);
  const count=Number.isFinite(override)&&override>0?Math.min(30,override):Number.isFinite(fallback)&&fallback>0?Math.min(30,fallback):1;
  for(const key of ['cal','p','c','f'])total[key]+=Math.max(0,Number(recipe[key])||0)*count;
  total.meals++;
 }
 for(const key of ['cal','p','c','f'])total[key]=Math.round(total[key]);
 return total;
}
