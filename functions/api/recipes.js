// Tablewise preview Pages Function. Private service-binding proxy only.
// Keep fail-closed until a SEPARATE recipe Worker is provisioned and approved.
// Never place provider credentials on Pages or forward arbitrary client headers.
const response=(message,status=503)=>new Response(JSON.stringify({error:message}),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export async function onRequest(context){
 const {request,env}=context;
 if(request.method!=='GET')return response('Method not allowed',405);
 const url=new URL(request.url);
 if(url.pathname!=='/api/recipes')return response('Not found',404);
 if(!env?.TABLEWISE_RECIPE_SERVICE||typeof env.TABLEWISE_RECIPE_SERVICE.fetch!=='function')return response('Online recipe search is not configured');
 // No open proxy: the downstream service receives the same fixed path and validated scope.
 const requestHeaders=new Headers();
 const origin=request.headers.get('Origin');
 if(origin)requestHeaders.set('Origin',origin);
 const referer=request.headers.get('Referer');
 if(referer)requestHeaders.set('Referer',referer);
 const connectingIp=request.headers.get('CF-Connecting-IP');
 if(connectingIp)requestHeaders.set('CF-Connecting-IP',connectingIp);
 const target=new URL('/api/recipes'+url.search,'https://tablewise-recipe-search.internal');
 try {
  return await env.TABLEWISE_RECIPE_SERVICE.fetch(new Request(target.toString(),{method:'GET',headers:requestHeaders}));
 } catch {
  return response('Online recipe search is temporarily unavailable');
 }
}
export const onRequestGet=onRequest;
