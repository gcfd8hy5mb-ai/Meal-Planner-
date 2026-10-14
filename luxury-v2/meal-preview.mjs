// In-memory luxury-v2 meal edits. This module never writes account or browser storage.
export function replacePreviewMeal(savedAccount, preview, week, day, slot, recipeId) {
 if (!savedAccount || ![1,2].includes(Number(week)) || !Number.isInteger(day) || day<0 || day>6 || ![0,1,2,3].includes(slot)) throw Error('Invalid meal placement');
 const active=savedAccount.activePlanningWeek===2?2:1;
 const key=Number(week)+'-'+day+'-'+slot;
 const copy={...preview};
 copy[key]=recipeId===null?null:String(recipeId);
 return copy;
}
export function previewAccount(savedAccount, preview) {
 if (!savedAccount) return null;
 const active=savedAccount.activePlanningWeek===2?2:1;
 const copyWeek=(bundle,week)=>{
   const plan={...(bundle?.plan||{})};
   const mealServings={...(bundle?.mealServings||{})};
   const dinnerSides={...(bundle?.dinnerSides||{})};
   for(const [key,id] of Object.entries(preview)){
     const [w,d,slot]=key.split('-').map(Number);
     if (w!==week) continue;
     const row=[...(plan[d]||[null,null,null,null])];
     if(row[slot]!==id){
       delete mealServings[d+'-'+slot];
       if(slot===2) delete dinnerSides[d];
     }
     row[slot]=id;
     plan[d]=row;
   }
   return {...(bundle||{}),plan,mealServings,dinnerSides};
 };
 const current=copyWeek(savedAccount,active);
 return {...current,alternateWeek:copyWeek(savedAccount.alternateWeek,active===1?2:1)};
}
export const hasPreviewEdits=(preview)=>Object.keys(preview).length>0;
