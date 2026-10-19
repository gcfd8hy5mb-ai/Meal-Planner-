// Read-only deployment/binding inventory for the currently active Kroger Worker.
// Logs no response bodies, script source, binding names/values, or credentials.
import {createHash} from 'node:crypto';
const name='tablewise-kroger';
const id=process.env.CLOUDFLARE_ACCOUNT_ID||'';
const token=process.env.CLOUDFLARE_API_TOKEN||'';
if(!/^[a-f0-9]{32}$/.test(id)||!token)throw Error('Protected environment API access unavailable');
const base='https://api.cloudflare.com/client/v4/accounts/'+id+'/workers/scripts/'+name;
const fingerprint=value=>createHash('sha256').update(String(value)).digest('hex').slice(0,12);
async function read(path){
 const res=await fetch(base+path,{method:'GET',headers:{Authorization:'Bearer '+token,Accept:'application/json'},signal:AbortSignal.timeout(15000),redirect:'error'});
 if(!res.ok)throw Error('Read-only Worker metadata request '+path+' failed HTTP '+res.status);
 const obj=await res.json();
 if(obj.success!==true)throw Error('Cloudflare did not confirm metadata request success: '+path);
 return obj.result;
}
const deployments=await read('/deployments');
const list=Array.isArray(deployments)?deployments:Array.isArray(deployments?.deployments)?deployments.deployments:[];
if(!list.length)throw Error('No active Worker deployment returned; do not certify rollback');
const active=list[0];
const versions=Array.isArray(active.versions)?active.versions:[];
if(!versions.length||versions.some(v=>!v.version_id||!Number.isFinite(Number(v.percentage))))throw Error('Active deployment versions missing or invalid');
const settings=await read('/settings');
const bindings=Array.isArray(settings?.bindings)?settings.bindings:[];
const counts={};
for(const binding of bindings){const kind=typeof binding?.type==='string'?binding.type:'unknown';counts[kind]=(counts[kind]||0)+1;}
const percentages=versions.map(v=>Number(v.percentage));
console.log(JSON.stringify({
 check:'read-only-live-worker-metadata',
 worker:name,
 activeVersionCount:versions.length,
 activeTrafficPercentages:percentages,
 activeDeploymentFingerprint:fingerprint(active.id||''),
 activeVersionFingerprints:versions.map(v=>fingerprint(v.version_id)),
 bindingTypeCounts:counts,
 bindingCount:bindings.length,
 compatibilityDatePresent:typeof settings?.compatibility_date==='string',
 metadataAvailable:true,
 rollbackBackupComplete:false
}));
console.log('This is NOT a backup. Worker source, settings values, binding names, version IDs and credentials were NOT exported or logged. No writes performed.');
