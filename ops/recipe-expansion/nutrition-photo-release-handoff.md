# Tablewise 110 — nutrition and photography release handoff

## Validated this pass
- Exactly 110 recipe drafts and exactly 110 paired natural-photo briefs were read from staging.
- Required recipe fields (servings, ingredients with quantities, detailed steps, prep and cook minutes, calories, protein, carbohydrate, fat) present.
- **Basic calorie/macronutrient arithmetic screen:** zero recipes exceeded 15% or 150 kcal discrepancy between listed calories and the 4/4/9 calorie estimate from grams of protein/carbohydrate/fat. **This does not make the nutrition numbers accurate** — the underlying nutrient estimates still lack ingredient-database reconciliation.

## Nutrition verification required
For each recipe, map each ingredient to a trustworthy food composition record with a documented identifier (e.g. USDA FoodData Central), convert units to edible grams, handle raw-versus-cooked yield and absorption, sum calories/protein/carbs/fat over the recipe, divide by the declared servings, and retain a reproducible calculation record. Do not mark macro verification passed using only a 4/4/9 consistency check.

## Photography required
- Zero of 110 corresponding expected image assets are currently marked saved and accepted.
- Use the recipe-specific `photoBrief` and ingredients; produce **one actual photo per recipe**, not a generic food image or low-resolution composite crop.
- Natural daylight/home-cooked food look; no text overlays, no incorrect proteins or garnish. Avoid tofu-centered additions.
- Save as `assets/meal-photos/exp01-XXX.webp` matching the manifest and audit the images visually.
- Only set `assetSaved: true` and `photoReview: "accepted"` after file existence, resolution/format checks, and ingredient-accurate visual review.
- Verify app photo mapping and grocery integration. Current recipe JSON is a **staging draft**, not an app catalog import.

## Release gate
Do not merge draft PR #200 before verified nutrition, approved photo assets, UI integration, CI, and mobile sign-in regression testing. Preserve the original 166 and unrelated release candidates.
