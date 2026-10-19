// Read-only Cloudflare Kroger Worker fingerprint check.
// NEVER emit the Worker code, OAuth secrets, API responses, or credentials to CI logs.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const workerName='tablewise-kroger';
const accountId=process.env.CLOUDFLARE_ACCOUNT_ID||'';
const token=process.env.CLOUDFLARE_API_TOKEN||'';
if(!/^[a-f0-9]{32}$/.test(accountId)||!token)throw Error('Protected environment Cloudflare account ID or API token is unavailable');
const uri='https://api.cloudflare.com/client/v4/accounts/'+accountId+'/workers/scripts/'+workerName;
const resp=await fetch(uri,{method:'GET',headers:{Authorization:'Bearer '+token,Accept:'*/*'},signal:AbortSignal.timeout(15000),redirect:'error'});
if(!resp.ok)throw Error('Read-only Cloudflare Worker download returned HTTP '+resp.status+' (no response body logged)');
const data=Buffer.from(await resp.arrayBuffer());
if(data.length<1000)throw Error('Unexpectedly small Worker response: refusing to certify backup baseline');
const sha=x=>createHash('sha256').update(x).digest('hex');
const original=readFileSync(new URL('../cloudflare/kroger/worker.js',import.meta.url));
if(!original.includes(Buffer.from('allowedApps'))||!original.includes(Buffer.from('KROGER_APP_ORIGIN')))throw Error('GitHub tracked Worker baseline lacks expected origin handling');
console.log('PASS read-only retrieval of current Cloudflare Worker');
console.log(JSON.stringify({worker:workerName,cloudflareSourceBytes:data.length,cloudflareSourceSHA256:sha(data),githubBaselineBytes:original.length,githubBaselineSHA256:sha(original),sameBytes:data.equals(original)}));
console.log('Source content and API credential intentionally omitted. No writes, deployments, OAuth requests, or cart operations performed.');
