import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const js=readFileSync(new URL('../luxury-v2/live.js',import.meta.url),'utf8');
test('switching accounts invalidates previous cart submissions',()=>{
 const reset=js.slice(js.indexOf('const clearKrogerProducts='),js.indexOf('const renderKrogerSelection='));
 assert.match(reset,/\+\+cartSubmissionEpoch/);
 assert.match(reset,/krogerCartPending=false/);
 assert.match(reset,/krogerStoreSelect\.disabled=false/);
});
test('stale cart responses cannot change current account selection or unlock its controls',()=>{
 const code=js.slice(js.indexOf("document.querySelector('#krogerAddCartButton').onclick"),js.indexOf('const krogerMatchButton='));
 assert.match(code,/const submissionEpoch=\+\+cartSubmissionEpoch/);
 assert.match(code,/if\(submissionEpoch!==cartSubmissionEpoch\|\|auth\.currentUser\?\.uid!==user\.uid/);
 assert.match(code,/if\(submissionEpoch===cartSubmissionEpoch&&auth\.currentUser\?\.uid===user\.uid/);
 assert.match(code,/finally\{if\(submissionEpoch===cartSubmissionEpoch\)/);
});
