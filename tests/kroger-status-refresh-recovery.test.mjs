import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const js=readFileSync(new URL('../luxury-v2/live.js',import.meta.url),'utf8');
test('Kroger refresh preserves verified UI state while checking',()=>{
 const section=js.slice(js.indexOf('const refreshKroger='),js.indexOf('krogerConnectButton.onclick='));
 assert.doesNotMatch(section,/krogerDisplay\('Checking Kroger connection/);
 assert.match(section,/krogerStatus\.textContent='Checking Kroger connection/);
 assert.match(section,/krogerDisconnectButton\.disabled=true/);
});
test('failed Kroger status refresh restores known state for same account',()=>{
 const section=js.slice(js.indexOf('const refreshKroger='),js.indexOf('krogerConnectButton.onclick='));
 assert.match(section,/auth\.currentUser\?\.uid===user\.uid/);
 assert.match(section,/krogerKnownConnected/);
});
test('last known connected state is stored only during display updates',()=>{
 assert.match(js,/let krogerKnownConnected=false/);
 assert.match(js,/const krogerDisplay=\(message,connected=false\)=>\{\s*krogerKnownConnected=connected/);
});
