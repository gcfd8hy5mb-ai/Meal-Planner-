# Tablewise: eight remaining recipes — estimated nutrition (October 22, 2026)

**Status: ESTIMATES ONLY, not ingredient verified and not a production release approval.**

User approved using estimates instead of withholding macro estimates until product-specific portions become available. Values below are per declared recipe serving and reproduced independently from the draft ingredients plus the seven explicit fallback mappings in `calculate-verified-nutrition.mjs`. Nutrition is approximate and depends on brand, portion size and cooking losses. Do not switch the seven ingredient `reviewStatus` values to `approved`, mark these eight recipe macros as verified, or bypass the existing exact-nutrition release gate.

| Recipe | kcal/serving | Protein (g) | Carbs (g) | Fat (g) | Important uncertainty |
|---|---:|---:|---:|---:|---|
| Pork Al Pastor Tacos | 590.7 | 31.7 | 50.8 | 29.7 | Achiote paste: 15 g/tbsp assumed; actual paste density/brand may vary |
| Garlic Parmesan Chicken Wings | 458.3 | 31.6 | 4.5 | 34.6 | USDA average cooked edible wing yield; split wings may differ |
| Sheet-Pan Lemon Herb Chicken and Potatoes | 615.6 | 40.6 | 42.7 | 32.3 | Cooked bone-in chicken-thigh yield and skin retention are variable |
| Balsamic Beef Short Ribs with Polenta | 612.2 | 26.7 | 23.5 | 44.5 | Historical cooked edible short-rib yield and fat retention are approximate |
| Crispy Ranch Potato Wedges with Chicken | 494.1 | 46.4 | 45.5 | 13.8 | Ranch seasoning uses provisional values from small rounded labels |
| Crispy Oven Barbecue Pork Ribs | 600.5 | 36.1 | 36.4 | 33.5 | UNSOURCED assumed 45% cooked edible yield for bone-in pork ribs: low confidence |
| Garlic Chili Noodles with Ground Pork | 782.8 | 37.2 | 78.4 | 33.7 | Chili garlic sauce provisional 3 kcal and 0.75 g carbs per tbsp; branded label rounded |
| Cider Braised Chicken with Apples | 484.1 | 35.5 | 26.9 | 25.7 | Cooked bone-in thigh yield and actual braising/skin retention vary |

## Coverage
- Ingredient labels in source ledger: **294**; **287 approved source mappings**, **7 provisional/needs-review**.
- Recipe draft count: **110**; **102 structurally complete without these fallbacks**, **8 calculated using explicit estimated fallbacks**.
- This is a reproducible arithmetic sanity check of staged ingredient inputs, **not independent food composition verification or test execution**.
- The current eight recipe labels must show `Estimated nutrition` if used in UI.
- In particular, the pork baby back ribs use an unsupported 45% edible-yield assumption; treat that recipe as low-confidence and allow later recalculation.
- Recipe-photo, UI integration, cloud-save, CI and iPhone validation gates remain independently required before merging the 110-recipe staging catalog into production.
