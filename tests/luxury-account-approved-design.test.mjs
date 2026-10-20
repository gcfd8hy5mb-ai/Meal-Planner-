import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const html=readFileSync(new URL('../luxury-v2/index.html',import.meta.url),'utf8');
const js=readFileSync(new URL('../luxury-v2/live.js',import.meta.url),'utf8');
test('approved luxury account controls replace gold legacy buttons',()=>{
 assert.match(html,/id="luxuryAccountIdentity"/);
 assert.match(html,/class="luxury-account-signout" id="luxurySignOut"/);
 assert.match(html,/class="luxury-account-close" id="luxuryCloseAccount"/);
 assert.doesNotMatch(html,/class="secondary full" id="luxurySignOut"/);
 assert.doesNotMatch(html,/class="secondary full" id="luxuryCloseAccount"/);
 assert.doesNotMatch(html,/>Saved plan health</);
});
test('diagnostic is not visible and signed-in card is state-driven',()=>{
 assert.match(html,/#luxuryRecoveryPanel\\{display:none!important\\}/);
 assert.match(js,/diagnosisPanel.hidden=true/);
 assert.match(js,/luxuryAccountIdentity/);
});
