const fs=require('node:fs'),assert=require('node:assert/strict');const app=fs.readFileSync('index.html','utf8');
assert.match(app,/'auth\/network-request-failed':'Firebase could not be reached/);
assert.match(app,/Your account and saved meals have not been reset/);
assert.match(app,/Do not create a new account or restart onboarding/);
assert.match(app,/if\(!state.preferences&&!state.onboardingInitialized\)\{/);
assert.match(app,/activeUid=null;\s*setMessage\('Your saved cloud document is missing meal preferences/);
assert.doesNotMatch(app,/setDoc\(doc\(db,'users',user.uid\),\{[^}]*preferences:\{/,'Auth recovery cannot automatically replace missing preferences');
console.log('PASS safe network errors and missing-preferences hold');