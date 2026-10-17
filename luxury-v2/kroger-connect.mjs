// Authenticated Kroger OAuth gateway. Never stores Kroger tokens in the browser.
export const KROGER_WORKER='https://tablewise-kroger.gcfd8hy5mb.workers.dev';
export async function krogerRequest(user,path,{method='GET'}={}){
 if(!user||typeof user.getIdToken!=='function')throw Error('Tablewise sign-in required');
 if(!['/status','/connect','/disconnect'].includes(path))throw Error('Unsupported Kroger action');
 const idToken=await user.getIdToken();
 const res=await fetch(KROGER_WORKER+path,{method,headers:{Authorization:'Bearer '+idToken,Accept:'application/json'},cache:'no-store'});
 const body=await res.json().catch(()=>({}));
 if(!res.ok)throw Error(typeof body.error==='string'?body.error:'Kroger is temporarily unavailable');
 if(path==='/connect'&&(!body.authorizationUrl||!body.authorizationUrl.startsWith('https://api.kroger.com/v1/connect/oauth2/authorize?')))throw Error('Kroger authorization link was not returned');
 return body;
}
