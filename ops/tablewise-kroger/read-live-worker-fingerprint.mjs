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
const original=readFileSync(new URL('../../cloudflare/kroger/worker.js',import.meta.url));
if(!original.includes(Buffer.from('allowedApps'))||!original.includes(Buffer.from('KROGER_APP_ORIGIN')))throw Error('GitHub tracked Worker baseline lacks expected origin handling');
console.log('PASS read-only retrieval of current Cloudflare Worker');
console.log(JSON.stringify({worker:workerName,cloudflareSourceBytes:data.length,cloudflareSourceSHA256:sha(data),githubBaselineBytes:original.length,githubBaselineSHA256:sha(original),sameBytes:data.equals(original)}));
// Metadata-only comparison. These checks are deliberately indicators, not semantic
// equivalence proofs and never serialize downloaded code or response headers.
// Cloudflare may return bundled/multipart content rather than the unbundled source.
const liveText=data.toString('utf8');
const markerGroups={
  originAllowlist:['KROGER_APP_ORIGIN','KROGER_PREVIEW_ORIGIN','Access-Control-Allow-Origin'],
  accountAuth:['Authorization','firebase','Valid Tablewise sign-in required'],
  oauth:['/connect','/auth/kroger/callback'],
  status:['/status'],
  cart:['/cart/add'],
  replayProtection:['oauth:','state']
};
const groups=Object.entries(markerGroups).map(([group,markers])=>({
  group,
  trackedSourceMarkersPresent:markers.every(marker=>original.includes(Buffer.from(marker))),
  deployedPayloadMarkersPresent:markers.every(marker=>liveText.includes(marker))
}));
const mediaType=(resp.headers.get('content-type')||'').split(';',1)[0].trim().toLowerCase();
const mediaClass=mediaType.startsWith('multipart/')?'multipart':mediaType.includes('javascript')?'javascript':'other-or-unknown';
const matchCount=groups.filter(group=>group.trackedSourceMarkersPresent&&group.deployedPayloadMarkersPresent).length;
console.log(JSON.stringify({comparisonKind:'nonsecret-feature-markers-only',mediaClass,featureGroups:groups,matchedGroupCount:matchCount,totalGroupCount:groups.length}));
console.log('CAUTION: Matching feature markers, equal hashes, and a successful HTTP GET do not certify rollback safety, executable equivalence, binding parity, or secure deployment.');
console.log('Source content and API credential intentionally omitted. No writes, deployments, OAuth requests, or cart operations performed.');
