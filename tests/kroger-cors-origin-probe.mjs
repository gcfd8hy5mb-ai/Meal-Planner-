// Read-only browser CORS preflight probe. Never sends credentials or a cart action.
// Designed for GitHub Actions network reachability, not as a live security claim.
const url='https://tablewise-kroger.gcfd8hy5mb.workers.dev/status';
const origins=[
 'https://gcfd8hy5mb-ai.github.io',
 'https://15015936.tablewise-luxury-preview.pages.dev',
 'https://362aa87c.tablewise-luxury-preview.pages.dev'
];
for(const origin of origins){
 try{
  const result=await fetch(url,{
   method:'OPTIONS',
   headers:{
    Origin:origin,
    'Access-Control-Request-Method':'GET',
    'Access-Control-Request-Headers':'authorization'
   },
   signal:AbortSignal.timeout(8000),
   redirect:'manual'
  });
  const allowOrigin=result.headers.get('access-control-allow-origin')||'(missing)';
  const allowMethods=result.headers.get('access-control-allow-methods')||'(missing)';
  const allowHeaders=result.headers.get('access-control-allow-headers')||'(missing)';
  const accepted=result.ok&&(allowOrigin==='*'||allowOrigin===origin)&&allowHeaders.toLowerCase().includes('authorization')&&allowMethods.toUpperCase().includes('GET');
  console.log(JSON.stringify({origin,status:result.status,allowOrigin,allowMethods,allowHeaders,accepted,redirected:result.status>=300&&result.status<400}));
 }catch(error){
  console.log(JSON.stringify({origin,probeFailed:true,errorName:error?.name||'unknown',message:String(error?.message||'network unavailable').slice(0,140)}));
 }
}
