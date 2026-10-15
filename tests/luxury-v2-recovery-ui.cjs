const fs=require('node:fs');
const assert=require('node:assert/strict');
const html=fs.readFileSync('luxury-v2/index.html','utf8');
const live=fs.readFileSync('luxury-v2/live.js','utf8');
assert.match(html,/id="saveLuxuryEdits" disabled/,'Cloud save remains disabled until original writer is migrated');
assert.match(html,/id="exportLuxuryEdits"/,'Preview edits can be exported');
assert.match(html,/id="exportRecoveredLuxury"/,'Device recovery export control is present');
assert.match(live,/readPendingLuxuryDraft\(localStorage,accountUid\)/,'Only active account draft is examined');
assert.match(live,/document\.querySelector\('#luxuryRecoverActions'\)\.hidden=true/,'Recovery data is hidden synchronously on sign-out');
assert.match(live,/document\.querySelector\('#exportLuxuryEdits'\)\.onclick=/,'Preview export action is wired');
assert.match(live,/document\.querySelector\('#exportRecoveredLuxury'\)\.onclick=/,'Recovered export action is wired');
assert.doesNotMatch(live,/\b(?:setDoc|updateDoc|deleteDoc)\s*\(/,'Luxury preview cannot mutate Firestore directly');
console.log('Luxury staged save/export controls and account-scoped recovery tests passed');

assert.match(live,/const LUXURY_SAVES_RELEASED=false/,'Production-facing save must remain disabled before hosted validation');
assert.match(live,/saveLuxuryButton\.onclick=async\(\)=>/,'Save action is wired for later controlled release');
assert.match(live,/commitLuxuryPreview\(\{/,'Save action must use backed-up transactional controller');
assert.match(live,/getAuthenticatedUid:\(\)=>authEpoch===epoch/,'Save must check the authenticated session epoch');
assert.match(live,/runTransaction:callback=>runTransaction\(db,callback\)/,'Save must use actual Firestore transactions');

assert.match(live,/getDocFromServer\(doc\(db,'users',uid\)\)/,'Luxury successful save must verify a server snapshot, not a local cache');
assert.match(live,/renderIngredients\(\);[\s\S]*?refreshRecovered\(\)/,'Recovery status refreshes after verified save and cleanup attempt');
assert.match(live,/retainBackupUntilVerified:true/,'Device draft remains available until fresh server snapshot');
assert.match(live,/classifyLuxuryRecovery\(backup,account,accountUid\)/,'Recovery status must distinguish already-committed saves from actual conflicts');

assert.match(live,/let transactionResult=null/,'Track cloud commit separately from reload result');
assert.match(live,/transactionResult=result/,'Record successful transaction before server reload');
assert.match(live,/if\(transactionResult\)\{[\s\S]*?Cloud write completed, but the server reload could not be verified/,'Never misreport a committed write as an unsaved draft');
assert.match(live,/else\{[\s\S]*?Save was not confirmed\. Review the device recovery options/,'An unconfirmed write must not promise an available export');
console.log('Cloud commit vs verification-failure user messaging regression passed');

assert.match(html,/id="luxurySignInForm"/,'Preview includes native sign-in form');
assert.match(html,/id="luxurySignOut"/,'Preview provides sign-out');
assert.doesNotMatch(html,/Account integration is pending/,'Profile placeholder is removed');
assert.match(live,/signInWithEmailAndPassword\(auth,/,'Sign-in uses Firebase Authentication');
assert.match(live,/await signOut\(auth\)/,'Sign-out uses Firebase Authentication');
assert.match(live,/const snapshot=await getDocFromServer\(doc\(db,'users',user.uid\)\)/,'Plan restoration requires live server data');
console.log('Luxury preview account form and read-only Firebase loading checks passed');
