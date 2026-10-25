import {prepareRenewal} from './renewal-safety.mjs';
import {selectedPlanSnapshot} from './save-guard.mjs';
// One atomic Firestore transaction archives the previous plan and updates only
// planning fields. The archive key is deterministic to prevent duplicate renewals.
export async function commitCalendarRenewal({original,generated,uid,now=new Date(),getAuthenticatedUid,runTransaction,userRef,archiveRef}){
 if(!uid||userRef?.id!==uid||getAuthenticatedUid?.()!==uid)throw Error('Renewal account mismatch');
 const expected=selectedPlanSnapshot(original);
 const oldCalendar=JSON.stringify([original.calendarWeekAnchor,original.calendarInitialWeek]);
 const prepared=prepareRenewal(original,generated,now);
 if(!prepared.ok)throw Error(prepared.reason);
 const completed=await runTransaction(async tx=>{
  if(getAuthenticatedUid?.()!==uid)throw Error('Account changed; renewal stopped');
  const currentSnapshot=await tx.get(userRef);
  const archiveSnapshot=await tx.get(archiveRef);
  if(!currentSnapshot.exists())throw Error('Current plan unavailable');
  if(archiveSnapshot.exists())throw Error('This previous plan has already been archived; reload before retrying');
  const current=currentSnapshot.data();
  if(selectedPlanSnapshot(current)!==expected||JSON.stringify([current.calendarWeekAnchor,current.calendarInitialWeek])!==oldCalendar)
   throw Error('Your saved meals or calendar changed in another session. Nothing was replaced.');
  const checked=prepareRenewal(current,generated,now);
  if(!checked.ok||checked.proposed.calendarWeekAnchor!==prepared.proposed.calendarWeekAnchor)throw Error('Calendar period changed; reload before saving');
  if(getAuthenticatedUid?.()!==uid)throw Error('Account changed; renewal stopped');
  tx.set(archiveRef,{...checked.archive,archivedAt:new Date().toISOString(),savedMealServings:current.mealServings??{},savedDinnerSides:current.dinnerSides??{}});
  tx.update(userRef,{
    ...checked.proposed,
    mealServings:Object.fromEntries(Object.entries(current.mealServings||{}).filter(([key])=>!/^[0-6]-2$/.test(key))),
    dinnerSides:{}
  });
  return {anchor:checked.proposed.calendarWeekAnchor,archiveStart:checked.archive.start};
 });
 if(getAuthenticatedUid?.()!==uid)throw Error('Renewal committed but account changed; verify in your account before continuing');
 return completed;
}
