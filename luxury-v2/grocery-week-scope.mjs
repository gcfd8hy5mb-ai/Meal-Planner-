// Canonical grocery week selection used by both counts and expanded list.
export function groceryWeeksForScope(scope){
  if(scope==='both')return [1,2];
  if(scope==='1'||scope===1)return [1];
  if(scope==='2'||scope===2)return [2];
  return [];
}
