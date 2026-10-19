import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';

const html=readFileSync(new URL('../luxury-v2/index.html',import.meta.url),'utf8');
const live=readFileSync(new URL('../luxury-v2/live.js',import.meta.url),'utf8');
const catalog=readFileSync(new URL('../luxury-v2/catalog.js',import.meta.url),'utf8');

test('all live direct ID selectors exist in the standalone luxury shell',()=>{
 const htmlIds=[...html.matchAll(/\bid=["']([^"'<>]+)["']/g)].map(m=>m[1]);
 const referenced=[...live.matchAll(/(?:querySelector|querySelectorAll)\(\s*['"]#([A-Za-z][\w:-]*)['"]\s*\)/g)].map(m=>m[1]);
 assert.equal(new Set(htmlIds).size,htmlIds.length,'duplicate element IDs');
 for(const id of referenced)assert.ok(htmlIds.includes(id),'missing interactive element #'+id);
 assert.ok(referenced.length>=75,'test unexpectedly skipped most selectors');
});
test('production cloud-save release gate remains disabled in guarded preview',()=>{
 assert.match(live,/const LUXURY_SAVES_RELEASED=false;/);
 assert.match(live,/if\(!LUXURY_SAVES_RELEASED\|\|luxurySaving/);
});
test('catalog contains 166 unique recipes with instructions and usable photo mappings',()=>{
 const context={};
 vm.runInNewContext(catalog.replace(/export\s*\{recipes,verifiedRecipePhotos\};?/,'')+'\n;globalThis.__catalog={recipes,verifiedRecipePhotos};',context,{timeout:3000});
 const {recipes,verifiedRecipePhotos}=context.__catalog;
 assert.equal(recipes.length,166);
 assert.equal(new Set(recipes.map(r=>r.id)).size,recipes.length);
 const missing=[];
 for(const recipe of recipes){
  assert.ok(Array.isArray(recipe.ingredients)&&recipe.ingredients.length>0,'missing ingredients: '+recipe.id);
  assert.ok(Array.isArray(recipe.steps)&&recipe.steps.length>=3,'incomplete recipe steps: '+recipe.id);
  const url=verifiedRecipePhotos[recipe.id];
  if(typeof url!=='string'||(!url.startsWith('https://')&&!url.startsWith('assets/')))missing.push(recipe.id);
  else if(url.startsWith('assets/')&&!existsSync(new URL('../'+url,import.meta.url)))missing.push(recipe.id+' (local file not found)');
 }
 assert.deepEqual(missing,[],'missing photo mappings (remote loading still needs device/network verification)');
});
test('Kroger requests remain authenticated and do not replay cart actions after iPhone restore',()=>{
 const gateway=readFileSync(new URL('../luxury-v2/kroger-connect.mjs',import.meta.url),'utf8');
 assert.match(gateway,/getIdToken\(\)/);
 assert.match(gateway,/AbortSignal\.timeout\(timeoutMs\)/);
 const resume=live.slice(live.indexOf('const refreshKrogerOnReturn='),live.indexOf('krogerConnectButton.onclick='));
 assert.match(resume,/void refreshKroger\(\)/);
 assert.doesNotMatch(resume,/(?:krogerRequest\([^\n]*(?:cart\/add|disconnect|connect))/);
 assert.match(live,/\+\+krogerActionEpoch;krogerActionPending=false;clearKrogerProducts/);
});

test('disposable hosted audit explicitly protects both accounts and refuses real-user records',()=>{
 const hosted=readFileSync(new URL('./hosted-firebase-disposable.test.mjs',import.meta.url),'utf8');
 assert.match(hosted,/TABLEWISE_HOSTED_TEST_APPROVED/);
 assert.match(hosted,/tablewise-ci-/);
 assert.match(hosted,/Test A already has data\. Refusing to overwrite/);
 assert.match(hosted,/Test B already has data\. Refusing to overwrite/);
 for(const message of ['B cannot read A','B cannot write A','B cannot delete A','A cannot read B','A cannot write B','A cannot delete B','Signed-out A cannot read private plan'])assert.ok(hosted.includes(message),'missing hosted coverage: '+message);
 assert.match(hosted,/if\(createdA\)/);
 assert.match(hosted,/if\(createdB\)/);
});

test('hosted test runner remains opt-in and restricted to guarded integration',()=>{
 const runner=readFileSync(new URL('../.github/workflows/hosted-disposable-firebase.yml',import.meta.url),'utf8');
 assert.match(runner,/workflow_dispatch:/);
 assert.match(runner,/environment: tablewise-hosted-test/);
 assert.match(runner,/branches:\s*\n\s*- integration\/luxury-v2-guarded/);
 assert.match(runner,/vars\.TABLEWISE_HOSTED_TEST_APPROVED == 'yes'/);
 assert.match(runner,/github\.ref_name == 'integration\/luxury-v2-guarded'/);
 assert.match(runner,/node --test tests\/hosted-firebase-disposable\.test\.mjs/);
 assert.match(runner,/TABLEWISE_TEST_A_EMAIL: \$\{\{ secrets\.TABLEWISE_TEST_A_EMAIL \}\}/);
 assert.match(runner,/TABLEWISE_TEST_B_EMAIL: \$\{\{ secrets\.TABLEWISE_TEST_B_EMAIL \}\}/);
 assert.doesNotMatch(runner,/service.account|GOOGLE_APPLICATION_CREDENTIALS|firebase_admin/i);
});

test('Worker live fingerprint flow is read-only and environment scoped',()=>{
 const wf=readFileSync(new URL('../.github/workflows/kroger-worker-readonly-audit.yml',import.meta.url),'utf8');
 const probe=readFileSync(new URL('../ops/tablewise-kroger/read-live-worker-fingerprint.mjs',import.meta.url),'utf8');
 assert.match(wf,/environment: tablewise-kroger-production/);
 assert.match(wf,/github\.ref_name == 'integration\/luxury-v2-guarded'/);
 assert.match(wf,/secrets\.CLOUDFLARE_API_TOKEN/);
 assert.doesNotMatch(wf,/wrangler\s+deploy|upload-artifact|workers\/scripts\/.*PUT|release/i);
 assert.match(probe,/method:'GET'/);
 assert.match(probe,/new URL\('\.\.\/\.\.\/cloudflare\/kroger\/worker\.js',import\.meta\.url\)/,'Worker baseline must resolve from nested ops/tablewise-kroger directory');
 assert.doesNotMatch(probe,/method:\s*['"](?:POST|PUT|PATCH|DELETE)['"]/);
 assert.doesNotMatch(probe,/console\.log\(\s*(?:token|data|await\s+resp\.text\(\)|data\.toString\(\))/);
 assert.match(probe,/comparisonKind:'nonsecret-feature-markers-only'/);
 assert.match(probe,/Matching feature markers, equal hashes/);
 assert.doesNotMatch(probe,/console\.log\(\s*(?:liveText|resp|headers)\s*\)/);
 assert.doesNotMatch(probe,/method:\s*['\"](?:POST|PUT|PATCH|DELETE)['\"]/);
});

test('live rollback inventory is read-only and never outputs Worker secrets or source',()=>{
 const wf=readFileSync(new URL('../.github/workflows/kroger-worker-readonly-audit.yml',import.meta.url),'utf8');
 const code=readFileSync(new URL('../ops/tablewise-kroger/read-rollback-metadata.mjs',import.meta.url),'utf8');
 assert.match(wf,/read-rollback-metadata\.mjs/);
 assert.match(wf,/environment: tablewise-kroger-production/);
 assert.match(code,/method:'GET'/);
 assert.match(code,/read\('\/deployments'\)/);
 assert.match(code,/read\('\/settings'\)/);
 assert.match(code,/rollbackBackupComplete:false/);
 assert.doesNotMatch(code,/method:\s*['"](?:POST|PUT|PATCH|DELETE)['"]/);
 assert.doesNotMatch(wf,/wrangler\s+deploy|upload-artifact/);
});

test('live active-version verification stays GET-only and blocks ambiguous rollback metadata',()=>{
 const source=readFileSync(new URL('../ops/tablewise-kroger/read-rollback-metadata.mjs',import.meta.url),'utf8');
 assert.match(source,/base\+'\/versions\/'.*encodeURIComponent\(deployed\.version_id\)/);
 assert.match(source,/activeVersionMetadataChecks:versionChecks/);
 assert.match(source,/matchesActiveDeployment:true/);
 assert.match(source,/rollbackBackupComplete:false/);
 assert.doesNotMatch(source,/method:\s*['"](?:PUT|POST|PATCH|DELETE)['"]/);
});
