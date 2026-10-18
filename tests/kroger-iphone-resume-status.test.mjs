import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const js=readFileSync(new URL('../luxury-v2/live.js',import.meta.url),'utf8');
const section=js.slice(js.indexOf('// iOS Safari may restore this page'),js.indexOf("const optionalToggle="));
test('iPhone return from background triggers read-only Kroger status recheck',()=>{
 assert.match(section,/addEventListener\('visibilitychange'/);
 assert.match(section,/document\.visibilityState==='visible'\)checkKrogerOnResume\(\)/);
 assert.match(section,/void refreshKroger\(\)/);
});
test('restored Safari page uses persisted pageshow without duplicate fetch',()=>{
 assert.match(section,/addEventListener\('pageshow'/);
 assert.match(section,/if\(event\.persisted\)checkKrogerOnResume\(\)/);
 assert.match(section,/now-krogerLastResumeCheckAt<1200/);
});
test('resume check avoids unauthenticated access and write retries',()=>{
 assert.match(section,/if\(!auth\.currentUser\|\|document\.visibilityState==='hidden'\)return/);
 assert.doesNotMatch(section,/krogerRequest\(|\/connect|\/disconnect|\/cart\/add/);
});
