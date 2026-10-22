# 110-recipe photography handoff

All 110 individual dark cinematic Tablewise photographs are saved as optimized
960×960 WebP files in `assets/recipe-expansion/exp01-001.webp` through
`assets/recipe-expansion/exp01-110.webp`, each at most 150 KiB.

The authoritative staged recipe-ID/path mapping is
`recipe-photo-production-manifest.json`. `photography-visual-reviews.json` records
the visual findings and binds each acceptance to both the final image hash and
the unchanged recipe hash. `photography-final-verification.json` records actual
decoding, file sizes, hashes and the all-pairs thumbnail similarity screen.

Validation commands from repository root:

```sh
node ops/recipe-expansion/validate-photography-staging.mjs --complete
node ops/recipe-expansion/audit-recipe-expansion-photos.mjs --complete
node --test tests/recipe-images.test.mjs tests/recipe-lookup.test.mjs tests/luxury-recipe-expansion-drafts.test.mjs tests/luxury-recipe-photo-pairing.test.mjs tests/luxury-recipe-image-quality.test.mjs
node ops/recipe-expansion/test-nutrition-release-gate.mjs
```

Final local result: 110 decoded, reviewed photographs; zero missing files,
duplicate bytes, original-asset duplicates or thumbnail similarity flags. All
110 identities and paths match. The 166 original recipe mappings and 158 local
original images are unchanged; the eight existing external mappings are also
unchanged. The relevant test suite passes 15 tests and skips its one opt-in
external URL reachability test. All eight estimated recipes remain estimates.

This is photography staging, not a production recipe release. The original app,
catalog, recipe drafts, ingredient quantities, instructions and nutrition evidence
remain unchanged. Older natural-light photo job files and draft `photoReady`
flags remain historical/unpublished; use the production manifest and hash-bound
reviews above for the completed photography inventory. A later release import
must use these exact paths and pass the separate content, nutrition, integration,
grocery and mobile release gates before publishing the expansion.
