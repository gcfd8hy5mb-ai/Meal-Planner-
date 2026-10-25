// Calendar week metadata. Never rewrites Firebase meals.
const DAY=86400000;
const toLocalDate=value=>new Date(value.getFullYear(),value.getMonth(),value.getDate());
export const sundayOf=value=>{const d=toLocalDate(value);d.setDate(d.getDate()-d.getDay());return d};
export const dateKey=value=>[value.getFullYear(),String(value.getMonth()+1).padStart(2,'0'),String(value.getDate()).padStart(2,'0')].join('-');
export const parseDateKey=value=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(value||''))return null;const [y,m,d]=value.split('-').map(Number),date=new Date(y,m-1,d);return dateKey(date)===value?date:null};
export const addDays=(date,days)=>{const d=toLocalDate(date);d.setDate(d.getDate()+days);return d};
export const weeksSince=(anchor,now)=>Math.round((Date.UTC(now.getFullYear(),now.getMonth(),now.getDate())-Date.UTC(anchor.getFullYear(),anchor.getMonth(),anchor.getDate()))/(7*DAY));
export const calendarStorageKey=uid=>'tablewise-calendar-anchor-'+uid;
export function readCalendarAnchor(storage,uid,now=new Date()){
 if(!uid)return null;
 try{
  const key=calendarStorageKey(uid),existing=parseDateKey(storage.getItem(key));
  if(existing&&existing.getDay()===0&&weeksSince(existing,sundayOf(now))>=0)return existing;
  if(existing)return null; // do not overwrite a corrupt or future anchor
  const anchor=sundayOf(now);
  storage.setItem(key,dateKey(anchor));
  return anchor;
 }catch{return null}
}
export function calendarPeriod(anchor,now=new Date(),initialWeek=1){
 if(!anchor)return null;
 const elapsed=weeksSince(anchor,sundayOf(now));
 const first=initialWeek===2?2:1,second=first===1?2:1;
 return {elapsed,activeWeek:elapsed===0?first:second,complete:elapsed>=2,firstWeek:first,secondWeek:second};
}
export function calendarWeekStart(anchor,week,initialWeek=1){
 if(!anchor)return null;
 return addDays(anchor,(Number(week)===(initialWeek===2?2:1)?0:7));
}
export const dateLabel=value=>value.toLocaleDateString('en-US',{month:'short',day:'numeric'});
export const weekRangeLabel=start=>start?dateLabel(start)+' – '+dateLabel(addDays(start,6)):'Dates unavailable';
