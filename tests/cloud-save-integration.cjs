const fs=require('node:fs');
const assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8');
assert.match(html,/import \{ guardedSave, CloudSaveConflict, createOnlyAccount \} from '\.\/cloud-save-guard\.mjs'/);
assert.match(html,/import \{ getFirestore, doc, getDoc, setDoc, runTransaction \}/);
assert.match(html,/const committed=await guardedSave\(/,'Save uses guarded transaction');
assert.doesNotMatch(html,/await setDoc\(doc\(db,'users',uid\),\{\.\.\.payload/,'Unconditional full-document save is forbidden');
assert.match(html,/if\(recovered\|\|pendingDraftUnavailable\)\{confirmedCloudDocument=null;cloudConflictBlocked=true;\}/,'Recovered drafts cannot overwrite cloud silently');
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
assert.match(html,/if\(err instanceof CloudSaveConflict\)\{cloudConflictBlocked=true;refreshDraftRecovery\(\)\}/,'Conflict state must latch');
assert.match(html,/if\(recovered\|\|pendingDraftUnavailable\)\{confirmedCloudDocument=null;cloudConflictBlocked=true;\}/,'Recovered draft must block automatic cloud writes');
assert.match(html,/cloudConflictBlocked=false;refreshDraftRecovery\(\);state=defaults\(\)/,'Switching accounts must clear previous conflict state');

assert.match(html,/id="downloadCloudDraft"[^>]*style="display:none"/,'Backup export must be hidden by default');
assert.match(html,/draftButton.onclick=\(\)=>\{if\(!cloudConflictBlocked\|\|!activeUid\|\|auth.currentUser\?\.uid!==activeUid/,'Backup export must be tied to authenticated owner and active conflict');
assert.match(html,/download='tablewise-unsaved-plan-'/,'Conflict backup must be a downloadable file');
assert.match(html,/if\(err instanceof CloudSaveConflict\)\{cloudConflictBlocked=true;refreshDraftRecovery\(\)\}/,'Conflict must expose recovery action');
assert.match(html,/if\(recovered\|\|pendingDraftUnavailable\)\{confirmedCloudDocument=null;cloudConflictBlocked=true;\}refreshDraftRecovery\(\)/,'Recovered draft must expose recovery action');

assert.match(html,/import \{ serializeUnsavedPlan \} from '\.\/draft-export\.mjs'/,'Backup uses validated serializer');
assert.match(html,/const backup=serializeUnsavedPlan\(state\)/,'Backup must serialize current unsaved state');

assert.match(html,/const uid=activeUid,sessionEpoch=authEpoch,sequence=\+\+saveSequence/,'Save must capture its authentication session');
assert.match(html,/authEpoch!==sessionEpoch\)return;if\(cloudConflictBlocked\)/,'Old queued session must not execute');
assert.match(html,/authEpoch===sessionEpoch&&auth\.currentUser\?\.uid===activeUid&&!signingOut/,'Transaction must validate original authentication session');
assert.match(html,/if\(activeUid===uid&&authEpoch===sessionEpoch\)confirmedCloudDocument=committed/,'Old session cannot replace new baseline');
assert.match(html,/const uid=activeUid,sessionEpoch=authEpoch,previous=state/,'Fresh-start must capture session');
assert.match(html,/getUid:\(\)=>epoch===authEpoch\?auth\.currentUser\?\.uid:null,initialDocument/,'Account creation must validate current session');

assert.match(html,/next:blank,replaceDocument:true,uid/,'Fresh start must replace the entire verified document');

assert.match(html,/state=previous;if\(err instanceof CloudSaveConflict\)\{cloudConflictBlocked=true;refreshDraftRecovery\(\)/,'Conflicted reset must protect local data and show backup action');
assert.match(html,/Reset blocked — cloud data changed/,'Reset conflicts must not claim the cloud is unchanged');
assert.match(html,/Reset failed — cloud data was not replaced/,'Network reset failure must not claim old remote data remains');

assert.match(html,/const uid=activeUid,sessionEpoch=authEpoch,previousState=state;let stillPending=false,signOutStarted=false/,'Backup marker flag must outlive sign-out try block');
assert.doesNotMatch(html,/try\{await writeChain;let stillPending=false;/,'Pending marker may not be scoped exclusively inside try');
assert.match(html,/if\(cloudConflictBlocked\)\{refreshDraftRecovery\(\);retryButton\.style\.display='none'\}/,'Sign-out failure with conflict must show draft export, not retry');
assert.match(html,/pendingCleared\?'Saved to cloud ✓':'Cloud saved, but device backup status could not be cleared/,'Storage cleanup failure cannot be displayed as fully saved');

assert.match(html,/if\(authEpoch!==sessionEpoch\|\|activeUid!==uid\|\|auth\.currentUser\?\.uid!==uid\)return;confirmedCloudDocument=confirmed/,'Reset success must not apply to a later session');
assert.match(html,/catch\(err\)\{if\(authEpoch!==sessionEpoch\|\|activeUid!==uid\|\|auth\.currentUser\?\.uid!==uid\)\{console\.warn\('Reset was cancelled after account change'/,'Reset failure must not restore another account state');

assert.match(html,/const uid=activeUid,sessionEpoch=authEpoch,previousState=state;let stillPending=false,signOutStarted=false/,'Sign-out must capture original session');
assert.match(html,/catch\(storageError\)\{stillPending=true;console\.warn\('Cannot read pending backup marker'/,'Unreadable backup status must prevent premature logout');
assert.match(html,/authEpoch!==sessionEpoch\)throw new Error\('Account changed during sign out/,'Queued sign-out must recheck session');
assert.match(html,/authEpoch===\(signOutStarted\?sessionEpoch\+1:sessionEpoch\)/,'Sign-out failure cannot restore a previous account session');

assert.match(html,/\.catch\(err=>\{if\(activeUid===uid&&authEpoch===sessionEpoch\)\{if\(err instanceof CloudSaveConflict\)\{cloudConflictBlocked=true;refreshDraftRecovery\(\)\}if\(sequence===saveSequence\)/,'An older conflicting save must latch before latest-sequence-only UI handling');

assert.match(html,/confirmedCloudDocument=confirmed;cloudResetCommitted=true;state=defaults\(\)/,'Cloud reset is marked committed before local cleanup');
assert.match(html,/if\(cloudResetCommitted\)\{document\.getElementById\('cloudStatus'\)\.textContent='Cloud reset completed/,'After a committed reset failure cannot restore stale account data');
assert.match(html,/if\(cloudResetCommitted\)[\s\S]*return\}state=previous;/,'Old local draft can only be restored if cloud transaction never committed');

assert.match(html,/import \{ clearResetBackup \} from '\.\/reset-backup\.mjs'/,'Reset uses tested backup cleanup helper');
assert.match(html,/const backupCleanup=clearResetBackup\(localStorage,uid\)/,'Committed reset cleanup must use marker-first guard');

assert.match(html,/if\(!localBackupSaved\)\{cloudConflictBlocked=true;lastSaveError=new Error\('Device backup failed/,'Failed pending backup must block cloud writes');
assert.match(html,/Device backup unavailable — cloud saving paused\. Export your draft before leaving\./,'User must see a draft recovery message on storage failure');
assert.match(html,/retryButton\.style\.display='none';return\}status\.textContent='Saving…'/,'Backup failure must return before queuing transaction');

assert.match(html,/import \{ savePendingDraft \} from '\.\/pending-draft\.mjs'/,'Draft writes must use marker-first backup helper');
assert.match(html,/const backupResult=savePendingDraft\(localStorage,uid,payload\)/,'Cloud save must record a pending marker before writing draft');

assert.match(html,/const pendingDraftUnavailable=pending&&!recovered/,'A missing or unreadable pending draft must be recognized on reload');
assert.match(html,/if\(recovered\|\|pendingDraftUnavailable\)\{confirmedCloudDocument=null;cloudConflictBlocked=true;\}/,'Both recovered and unreadable pending drafts must lock cloud writes');
assert.match(html,/Pending edits were detected, but their device backup is missing or unreadable/,'Unavailable backup state must not display Cloud connected');
