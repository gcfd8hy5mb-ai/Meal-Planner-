# USDA nutrition review checkpoint — October 21, 2026

Source: consolidated candidate report in GitHub Actions run 39649010943, based on search run 39648515850.

The search covered all 294 ingredient labels. 291 have search candidates and 3 did not: Breadcrumbs, Jalapeño, Panko breadcrumbs. Alternative exact-term queries were added to the USDA search script for those three names. These are candidates only, not approved matches.

CRITICAL QUALITY FINDING: Achiote paste returned search suggestions such as Almond paste and Guava paste. These are different foods and must NOT be used for nutrition calculations. API success does not imply a usable nutrition match.

For each ingredient, require a correct food identity, preparation state, food record ID, nutrient content per 100 grams, and verified edible-gram conversion for the recipe unit. Use alternate verified label data if no adequate USDA match exists.

Verified recipes: 0/110. Approved photographs: 0/110. PR #200 remains draft and unmerged.
