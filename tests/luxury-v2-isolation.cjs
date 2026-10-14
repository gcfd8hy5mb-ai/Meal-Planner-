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
assert.doesNotMatch(html, /<script[^>]+src=/i, 'No legacy scripts');
assert.doesNotMatch(html, /(?:src|href)=["']\.\.\//i, 'No relative imports from legacy app');
assert.doesNotMatch(html, /\b(primaryNav|navMoreMenu|groceryGroup|mealDialog|recipegrid|foodWeekItem)\b/, 'No legacy layout classes');
assert.ok(!html.includes(legacy.slice(0, 180)), 'Legacy document must not be duplicated');
for (const screen of ['today', 'week', 'groceries', 'cook']) {
 assert.match(html, new RegExp('data-page="'+screen+'"'), screen+' screen missing');
 assert.match(html, new RegExp('data-nav="'+screen+'"'), screen+' nav missing');
}
assert.doesNotMatch(legacy, /luxury-v2\/index\.html|feature\/luxury-v2-isolated-shell/, 'Legacy app is not redirected or replaced');
console.log('Luxury v2 visual isolation checks passed');
