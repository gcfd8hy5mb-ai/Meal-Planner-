const fs=require('node:fs');
const assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8');
assert.match(html,/import \{ guardedSave, CloudSaveConflict, createOnlyAccount \} from '\.\/cloud-save-guard\.mjs'/);
assert.match(html,/import \{ getFirestore, doc, getDoc, setDoc, runTransaction \}/);
assert.match(html,/const committed=await guardedSave\(/,'Save uses guarded transaction');
assert.doesNotMatch(html,/await setDoc\(doc\(db,'users',uid\),\{\.\.\.payload/,'Unconditional full-document save is forbidden');
assert.match(html,/if\(recovered\)\{confirmedCloudDocument=null;cloudConflictBlocked=true;\}/,'Recovered drafts cannot overwrite cloud silently');
assert.match(html,/confirmedCloudDocument=snapshot\.data\(\)/,'Last-confirmed cloud snapshot must be initialized');
assert.match(html,/confirmedCloudDocument=committed/,'Successful writes advance baseline');
assert.match(html,/confirmedCloudDocument=null;cloudConflictBlocked=false;refreshDraftRecovery\(\);state=defaults\(\)/,'Sign-out clears baseline');
assert.match(html,/const initialDocument=\{\.\.\.state,custom:'\[\]',onboardingInitialized:true\}/,'New accounts retain explicit registration flow');
assert.match(html,/await createOnlyAccount\(/,'Account creation must be create-only');
assert.doesNotMatch(html,/await setDoc\(/,'No unrestricted writes including reset and registration');
assert.match(html,/const confirmed=await guardedSave\(/,'Fresh-start reset must be conflict guarded');
assert.doesNotMatch(html,/reconciliation\.if\(!state/,'Offline recovery logic must not be swallowed by comments');
assert.match(html,/err instanceof CloudSaveConflict/,'Cloud conflicts must be visible to user');
console.log('Production-save migration structural safety checks passed');

assert.match(html,/if\(cloudConflictBlocked\)throw new CloudSaveConflict\(\)/,'Previously observed conflicts must stop later queued writes');
assert.match(html,/if\(err instanceof CloudSaveConflict\)cloudConflictBlocked=true/,'Conflict state must latch');
assert.match(html,/if\(recovered\)\{confirmedCloudDocument=null;cloudConflictBlocked=true;\}/,'Recovered draft must block automatic cloud writes');
assert.match(html,/cloudConflictBlocked=false;refreshDraftRecovery\(\);state=defaults\(\)/,'Switching accounts must clear previous conflict state');

assert.match(html,/id="downloadCloudDraft"[^>]*style="display:none"/,'Backup export must be hidden by default');
assert.match(html,/draftButton.onclick=\(\)=>\{if\(!cloudConflictBlocked\|\|!activeUid\|\|auth.currentUser\?\.uid!==activeUid/,'Backup export must be tied to authenticated owner and active conflict');
assert.match(html,/download='tablewise-unsaved-plan-'/,'Conflict backup must be a downloadable file');
assert.match(html,/if\(err instanceof CloudSaveConflict\)cloudConflictBlocked=true;refreshDraftRecovery\(\)/,'Conflict must expose recovery action');
assert.match(html,/if\(recovered\)\{confirmedCloudDocument=null;cloudConflictBlocked=true;\}refreshDraftRecovery\(\)/,'Recovered draft must expose recovery action');
