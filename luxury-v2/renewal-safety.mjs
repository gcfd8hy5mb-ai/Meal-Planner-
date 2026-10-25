import {addDays,dateKey,parseDateKey,sundayOf,weeksSince} from './calendar-weeks.mjs';
// Pure renewal gate. It never writes account data.
export function renewalEligibility(account,now=new Date()){
 const anchor=parseDateKey(account?.calendarWeekAnchor);
 if(!anchor||anchor.getDay()!==0)return {ready:false,reason:'Calendar start is not verified'};
 const elapsed=weeksSince(anchor,sundayOf(now));
 if(elapsed<2)return {ready:false,reason:'Current two-week plan is still active'};
 if(!account?.plan||!account?.alternateWeek?.plan)return {ready:false,reason:'Both saved weeks must be available'};
 if(!Number.isInteger(elapsed)||elapsed<0)return {ready:false,reason:'Calendar date is invalid'};
 return {ready:true,elapsed,nextAnchor:dateKey(addDays(anchor,Math.floor(elapsed/2)*14))};
}
export function prepareRenewal(existing,generated,now=new Date()){
 const gate=renewalEligibility(existing,now);
 if(!gate.ready)return {ok:false,reason:gate.reason};
 if(!generated?.week1||!generated?.week2||!Array.from({length:7},(_,i)=>i).every(i=>Array.isArray(generated.week1[i])&&Array.isArray(generated.week2[i])))return {ok:false,reason:'Two complete generated weeks required'};
 // An explicit confirmation and archival write are required before applying this patch.
 const archive={start:existing.calendarWeekAnchor,end:dateKey(addDays(parseDateKey(gate.nextAnchor),-1)),plan:structuredClone(existing.plan),alternateWeek:structuredClone(existing.alternateWeek),activePlanningWeek:existing.activePlanningWeek};
 return {ok:true,requiresConfirmation:true,archive,proposed:{calendarWeekAnchor:gate.nextAnchor,calendarInitialWeek:1,activePlanningWeek:1,plan:structuredClone(generated.week1),alternateWeek:{...existing.alternateWeek,plan:structuredClone(generated.week2)}}};
}
