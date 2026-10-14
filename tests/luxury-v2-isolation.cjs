// Luxury v2 must remain a separate document without any legacy visual assets.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const html = fs.readFileSync('luxury-v2/index.html', 'utf8');
const legacy = fs.readFileSync('index.html', 'utf8');
assert.match(html, /<!doctype html>/i, 'Must be a standalone HTML document');
assert.match(html, /<style>[\s\S]*<\/style>/i, 'Own CSS is required');
assert.match(html, /<main>[\s\S]*<\/main>/i, 'Own layout is required');
assert.doesNotMatch(html, /<link[^>]+rel=["']stylesheet["']/i, 'No shared or external stylesheets');
assert.doesNotMatch(html, /@import|<iframe\b|<object\b|<embed\b/i, 'No embedded legacy presentation');
assert.doesNotMatch(html, /<script[^>]+src=["'](?!\.\/live\.js)/i, 'No legacy scripts');
assert.match(html, /<script type="module" src="\.\/live\.js"><\/script>/, 'Read-only account adapter must be loaded');
// Photo assets are shared content, not legacy visual styles or scripts.
for (const match of html.matchAll(/(?:src|href)=["']\.\.\/([^"']+)/gi)) {
 assert.ok(match[1]==='assets/meal-photos/' || /^assets\/meal-photos\/[a-zA-Z0-9_-]+\.webp$/.test(match[1]), 'Only verified recipe images may be shared');
}
assert.doesNotMatch(html, /\b(primaryNav|navMoreMenu|groceryGroup|mealDialog|recipegrid|foodWeekItem)\b/, 'No legacy layout classes');
for (const legacyRule of ['.primaryNav{', '.navMoreMenu{', '.recipegrid .card{', '.shoppingHeading{']) {
 assert.ok(legacy.includes(legacyRule), 'Expected baseline legacy rule is missing: '+legacyRule);
 assert.ok(!html.includes(legacyRule), 'Legacy CSS leaked into v2: '+legacyRule);
}
for (const screen of ['today', 'week', 'groceries', 'cook']) {
 assert.match(html, new RegExp('data-page="'+screen+'"'), screen+' screen missing');
 assert.match(html, new RegExp('data-nav="'+screen+'"'), screen+' nav missing');
}
assert.doesNotMatch(legacy, /luxury-v2\/index\.html|feature\/luxury-v2-isolated-shell/, 'Legacy app is not redirected or replaced');
console.log('Luxury v2 visual isolation checks passed');

// No user-facing copy may point users back to the legacy interface.
const luxuryAdapter = fs.readFileSync('luxury-v2/live.js', 'utf8');
for (const text of ['original planner', 'original app', 'legacy app']) {
 assert.ok(!html.toLowerCase().includes(text), 'Legacy wording in luxury document: '+text);
 assert.ok(!luxuryAdapter.toLowerCase().includes(text), 'Legacy wording in luxury data adapter: '+text);
}

// Sample week rotations must not impersonate a user's saved plan.
assert.doesNotMatch(html, /const demoMeals\s*=|function renderDays\s*\(/, 'Demo week rotation must not render in luxury v2');
assert.match(html, /Sign in to view your saved two-week plan/, 'Signed-out week must explain the absence of saved plan data');

// No sample grocery entries or invented cooking directions may be shown before account data loads.
assert.doesNotMatch(html, /const groceryDemo\s*=|const cookSteps\s*=|const demoMeals\s*=/, 'No hard-coded demo food data');
assert.doesNotMatch(html, /Preview recipe · 4 servings|Creamy Garlic Chicken<\/h2>/, 'No pretend saved meal in the hero');
assert.match(html, /No recipe selected/, 'Cook page must have a truthful empty state');

// Account isolation: clear previous person's private content before asynchronous account loading.
assert.match(luxuryAdapter, /const resetPrivateView=\(\)=>/, 'Explicit account-view reset is required');
assert.match(luxuryAdapter, /onAuthStateChanged\(auth,async user=>\{const epoch=\+\+authEpoch;resetPrivateView\(\)/, 'Reset must run at the start of every auth transition');
for(const privateRegion of ["#days",".hero-copy h2",".hero-photo",".cook-photo","#cookStepBody","#luxuryMealChoices",".simple .meal-row","#groceryItems"]){
 assert.ok(luxuryAdapter.includes(privateRegion), 'Missing private region scrub: '+privateRegion);
}
assert.match(luxuryAdapter, /currentRecipe=null;step=0;previewEdits=\{\}/, 'Recipe and preview data must be discarded during account switching');
assert.match(luxuryAdapter, /if\(!loaded.preferences\)[\s\S]*return\}account=loaded;accountUid=user.uid/, 'Only valid saved account data may become visible');
