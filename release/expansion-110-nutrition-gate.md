# Expansion nutrition and production release decision (2026-10-22)

The 110 new recipes and their verified photographs are preserved in this branch. The photo-to-recipe pairing CI passes, but the recipe draft metadata reports:
- 61 with `rough-estimate-needs-ingredient-database-verification`.
- 49 with `estimated-needs-ingredient-database-verification`.
- 110 have numeric calories/protein/carbs/fats, but none are marked independently verified.
- Draft recipes remain unpublished, while the existing 166-recipe catalog remains unchanged.

**Production gate:** Do not represent estimated nutrition as USDA-verified. Do not silently enable the 110 draft recipes or overwrite the existing catalog. Release the redesign separately after authentication, save/migration, Kroger, iPhone and reversible cutover validation. If the new recipes are approved for early release before ingredient verification, they must clearly show an estimated-nutrition label and pass independent editorial review and updated catalog tests.

This file records status; it does not publish recipes, change user data or authorize a deploy.
