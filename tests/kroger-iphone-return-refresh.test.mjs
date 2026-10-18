import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const js=readFileSync(new URL('../luxury-v2/live.js',import.meta.url),'utf8');
const section=js.slice(js.indexOf('// iOS can restore a suspended tab'),js.indexOf('krogerConnectButton.onclick='));
test('return from iPhone background triggers read-only Kroger refresh',()=>{
 assert.match(section,/addEventListener\('pageshow'/);
 assert.match(section,/event\.persisted/);
 assert.match(section,/addEventListener\('visibilitychange'/);
 assert.match(section,/document\.visibilityState==='visible'/);
 assert.match(section,/void refreshKroger\(\)/);
});
test('resume refresh avoids unauthenticated calls and duplicate iOS events',()=>{
 assert.match(section,/!auth\.currentUser/);
 assert.match(section,/now-krogerLastReturnRefresh<1500/);
 assert.doesNotMatch(section,/krogerRequest\([^)]*'\/(connect|disconnect|cart\/add)'/);
});
