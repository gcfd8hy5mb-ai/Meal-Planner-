import {dateKey,parseDateKey,sundayOf,weeksSince} from './calendar-weeks.mjs';
export function resolveCalendarAnchor(cloudAnchor,localAnchor,now=new Date()){
 const cloud=parseDateKey(cloudAnchor);
 if(cloud&&cloud.getDay()===0&&weeksSince(cloud,sundayOf(now))>=0)return {anchor:cloud,source:'cloud'};
 const local=localAnchor&&localAnchor.getDay()===0&&weeksSince(localAnchor,sundayOf(now))>=0?localAnchor:null;
 return {anchor:local||sundayOf(now),source:local?'device':'new'};
}
export async function ensureCloudCalendar({runTransaction,documentRef,getAuthenticatedUid,localAnchor,now=new Date()}){
 const uid=getAuthenticatedUid?.();
 if(!uid||documentRef?.id!==uid)throw Error('Calendar account mismatch');
 return runTransaction(async tx=>{
  if(getAuthenticatedUid?.()!==uid)throw Error('Account changed during calendar read');
  const snapshot=await tx.get(documentRef);
  if(!snapshot.exists())throw Error('Cloud plan unavailable');
  const data=snapshot.data();
  const result=resolveCalendarAnchor(data.calendarWeekAnchor,localAnchor,now);
  if(data.calendarWeekAnchor!=null){
   if(result.source!=='cloud')throw Error('Existing cloud calendar is invalid; do not overwrite it');
   return {anchor:result.anchor,initialWeek:data.calendarInitialWeek===2?2:1,written:false};
  }
  if(getAuthenticatedUid?.()!==uid)throw Error('Account changed during calendar write');
  const initialWeek=data.activePlanningWeek===2?2:1;
  tx.update(documentRef,{calendarWeekAnchor:dateKey(result.anchor),calendarInitialWeek:initialWeek});
  return {anchor:result.anchor,initialWeek,written:true};
 });
}
