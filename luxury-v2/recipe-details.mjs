// Read-only presentation metadata; never mutates recipe quantities or saved meals.
// Explicitly supplied recipe metadata wins over concise catalog-derived fallback.
const nice=s=>String(s||'').trim().replace(/\s+/g,' ');
export function recipeSummary(recipe){
 if(!recipe)return {description:'',time:''};
 const description=nice(recipe.description||recipe.summary)||
   ((recipe.ingredients||[]).slice(0,3).map(x=>nice(x[0]).toLowerCase()).filter(Boolean).join(', ').replace(/, ([^,]+)$/,' and $1'));
 const prep=Number(recipe.prepMinutes??recipe.prepTimeMinutes);
 const cook=Number(recipe.cookMinutes??recipe.cookTimeMinutes);
 const validPrep=Number.isFinite(prep)&&prep>0;
 const validCook=Number.isFinite(cook)&&cook>0;
 const time=(validPrep?'Prep '+prep+' min':'')+(validPrep&&validCook?' · ':'')+(validCook?'Cook '+cook+' min':'');
 return {description:description?description[0].toUpperCase()+description.slice(1)+'.':'Recipe details',time:time||'Prep and cook times being reviewed'};
}
