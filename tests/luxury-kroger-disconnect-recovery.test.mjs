import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const js=readFileSync(new URL('../luxury-v2/live.js',import.meta.url),'utf8');
test('connected state restores Disconnect button after an error',()=>{
 const state=js.slice(js.indexOf('const krogerDisplay='),js.indexOf('const groceryKrogerToggle='));
 assert.match(state,/krogerDisconnectButton\.hidden=!connected/);
 assert.match(state,/krogerDisconnectButton\.disabled=!auth\.currentUser\|\|!connected/);
});
test('disconnect request uses connected UI for failed request',()=>{
 const section=js.slice(js.indexOf('krogerDisconnectButton.onclick='),js.indexOf('const optionalToggle='));
 assert.match(section,/krogerDisconnectButton\.disabled=true/);
 assert.match(section,/krogerDisplay\(error\.message\|\|'Could not disconnect Kroger\.',true\)/);
});
