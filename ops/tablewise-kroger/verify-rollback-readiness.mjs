// Read-only rollback readiness gate. No secret values or live source are logged.
// A Cloudflare version metadata GET is NOT evidence of a restorable backup.
import {createHash} from 'node:crypto';
const id=process.env.CLOUDFLARE_ACCOUNT_ID||'',token=process.env.CLOUDFLARE_API_TOKEN||'';
if(!/^[a-f0-9]{32}$/.test(id)||!token)throw Error('Protected Cloudflare credentials missing');
const root='https://api.cloudflare.com/client/v4/accounts/'+id+'/workers/scripts/tablewise-kroger';
const read=async path=>{const res=await fetch(root+path,{headers:{Authorization:'Bearer '+token,Accept:'application/json'},signal:AbortSignal.timeout(15000),redirect:'error'});if(!res.ok)throw Error('Read-only Cloudflare request failed HTTP '+res.status);const json=await res.json();if(!json.success)throw Error('Cloudflare metadata response failed');return json.result};
const deployments=await read('/deployments');const entries=Array.isArray(deployments)?deployments:deployments?.deployments||[];
const versions=entries[0]?.versions||[];
if(versions.length!==1||Number(versions[0].percentage)!==100)throw Error('Active deployment changed; stop rollback preparation');
const active=versions[0].version_id;
const detail=await read('/versions/'+encodeURIComponent(active));
if(String(detail?.id||detail?.version_id||'')!==active)throw Error('Version mismatch; stop rollback preparation');
const settings=await read('/settings');const bindings=Array.isArray(settings?.bindings)?settings.bindings:[];
const types=bindings.reduce((a,b)=>(a[b.type]=(a[b.type]||0)+1,a),{});
const fingerprint=createHash('sha256').update(active).digest('hex').slice(0,12);
console.log(JSON.stringify({check:'rollback-readiness',activeVersionFingerprint:fingerprint,activeTraffic:100,bindingTypes:types,activeVersionMetadataVerified:true,privateRestorableBackupVerified:false,rollbackExerciseVerified:false,deployAllowed:false}));
console.log('BLOCKED: Cloudflare version metadata is not an exported, independently verified private source/settings backup. No writes or deployments performed.');
