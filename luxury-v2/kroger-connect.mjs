// Authenticated Kroger OAuth gateway. Never stores Kroger tokens in the browser.
export const KROGER_WORKER='https://tablewise-kroger.gcfd8hy5mb.workers.dev';
export async function krogerRequest(user,path,{method='GET',params=null,body=null,timeoutMs=15000}={}){
 if(!user||typeof user.getIdToken!=='function')throw Error('Tablewise sign-in required');
 if(!['/status','/connect','/disconnect','/products','/locations','/cart/add'].includes(path))throw Error('Unsupported Kroger action');
 const idToken=await user.getIdToken();
 const signal=AbortSignal.timeout(timeoutMs);
 let res,responseData;
 try{
  res=await fetch(KROGER_WORKER+path+(params?'?'+new URLSearchParams(params):''),{method,headers:{Authorization:'Bearer '+idToken,Accept:'application/json',...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,cache:'no-store',signal});
  responseData=await res.json().catch(error=>{if(signal.aborted)throw error;return {}});
 }catch(error){
  if(signal.aborted)throw Error('Kroger request timed out. The action may have completed; check your Kroger connection before trying again.');
  throw error;
 }
 if(!res.ok)throw Error(typeof responseData.error==='string'?responseData.error:'Kroger is temporarily unavailable');
 if(path==='/connect'&&(!responseData.authorizationUrl||!responseData.authorizationUrl.startsWith('https://api.kroger.com/v1/connect/oauth2/authorize?')))throw Error('Kroger authorization link was not returned');
 return responseData;
}
