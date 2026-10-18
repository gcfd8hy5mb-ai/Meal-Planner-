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
  if(error instanceof TypeError)throw Error('Kroger gateway is unreachable from this preview. Check the Worker allowed-origins/CORS configuration and network connection.');
  throw error;
 }
 if(!res.ok){
  if(res.status===401||res.status===403)throw Error('Kroger gateway rejected the authenticated request (HTTP '+res.status+'). Check Worker Firebase authentication and preview access.');
  throw Error('Kroger gateway returned HTTP '+res.status+'. Connection could not be verified.');
 }
 if(path==='/connect'&&(!responseData.authorizationUrl||!responseData.authorizationUrl.startsWith('https://api.kroger.com/v1/connect/oauth2/authorize?')))throw Error('Kroger authorization link was not returned');
 return responseData;
}
