import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const js=readFileSync(new URL('../luxury-v2/live.js',import.meta.url),'utf8');
const section=js.slice(js.indexOf('krogerDisconnectButton.onclick='),js.indexOf('const optionalToggle='));
test('uncertain Kroger disconnect outcome uses a read-only status refresh',()=>{
 assert.match(section,/catch\(error\)[\s\S]*?await refreshKroger\(\)/);
 assert.doesNotMatch(section,/catch\(error\)[\s\S]*?krogerDisplay\(error\.message\|\|'Could not disconnect Kroger\.',true\)/);
});
test('a delayed refresh cannot update a later account session',()=>{
 assert.match(section,/epoch!==krogerEpoch\|\|auth\.currentUser\?\.uid!==user\.uid/);
 assert.match(section,/epoch\+1!==krogerEpoch\|\|auth\.currentUser\?\.uid!==user\.uid/);
});
test('the uncertain result explains checking connection before retrying',()=>{
 assert.match(section,/Disconnect result is uncertain\. Check Kroger connection again before retrying/);
});
