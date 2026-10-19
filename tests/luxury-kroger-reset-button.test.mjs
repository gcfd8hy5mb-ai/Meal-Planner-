import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('resetting interrupted Kroger matching re-enables the match button',()=>{
 const source=readFileSync(new URL('../luxury-v2/live.js',import.meta.url),'utf8');
 const reset=source.slice(source.indexOf('const resetKrogerMatches='),source.indexOf('const appendKrogerMatch='));
 assert.match(reset,/krogerMatchButton\.disabled=false/);
 assert.match(reset,/\+\+matchEpoch/);
});
