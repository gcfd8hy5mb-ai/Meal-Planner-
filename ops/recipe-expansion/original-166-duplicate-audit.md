# Tablewise 110 versus original 166 — duplication review (2026-10-21)

**Source:** Current `main/index.html`, first 12 `const recipes` plus the five `recipes.push(...[...])` arrays. Exactly **166 original ID-distinct recipe records**. Staged set: 110 entries in `ops/recipe-expansion/batch-01-recipe-drafts.json`.

## Comparison results
- All 110 compared against exact original names and normalized title-token similarities.
- 15 prior obvious overlaps were already replaced in the staging branch.
- No exact normalized title duplicates remain.
- **Ingredient/method close overlaps requiring replacement:** `exp01-059` Teriyaki Chicken Rice Bowls vs Teriyaki Chicken and Rice; `exp01-060` Classic Beef Stroganoff vs Country Beef Stroganoff; `exp01-065` Slow-Cooker Beef Stew vs Country Beef Stew; `exp01-067` Skillet Lasagna vs Homestyle Lasagna.
- **Review for distinct method/ingredients before approving:** `exp01-071` Chicken and Leek Pot Pie vs Homestyle Chicken Pot Pie; `exp01-085` One-Pan Creamy Garlic Chicken and Rice vs Creamy Garlic Chicken; `exp01-089` Chicken Parmesan Meatballs vs Chicken Parmesan; `exp01-093` Cheeseburger Stuffed Shells vs Homestyle Cheeseburger; `exp01-100` Ranch Potato Wedges with Chicken vs Creamy Ranch Chicken.
- **Likely distinct based on significant ingredient/method differences:** Chicken Tinga Tacos and Salsa Verde Chicken Tacos use different chiles/salsa, braising and corn tortillas compared with Homestyle Chicken Tacos. Garlic Parmesan Chicken Wings are different from chicken Parmesan cutlets.
- The above is a targeted semantic review, **not certification that every recipe is substantially unique**; further pairwise ingredient/method checks and manual inspection are needed.
- Macro figures are explicitly unverified estimates; all 110 images remain unsaved/unapproved.

## Required release gates
Replace four highly overlapping recipes with fully developed alternatives, update matching photo briefs, confirm no within-batch overlaps, verify actual ingredient-based nutrition values, photograph all recipes, test shopping and app integrations. Do not merge draft PR #200 yet.

## Replacement update

The four high-overlap recipe records were replaced on the staging branch, preserving their IDs: exp01-059 → Pineapple Ginger Chicken Lettuce Cups; exp01-060 → Balsamic Steak and Roasted Grape Salad; exp01-065 → Apple Cider Pork and Sweet Potato Sheet Pan; exp01-067 → Ricotta Spinach Stuffed Portobellos. Recipe instructions, measured ingredients, estimates and matching photographic briefs were updated. This is not a full semantic or nutrition certification.

## Final flagged near-duplicate review (2026-10-21)

Compared the remaining five flagged dishes against their originals' named ingredients and cooking methods. Replaced `exp01-071` chicken/leek pot pie with Lemon Dill Chicken and Barley Skillet (chicken with barley, lemon, dill, spinach; no pastry), and `exp01-093` Bacon Cheeseburger Stuffed Shells with Balsamic Turkey and Roasted Beet Grain Bowls (ground turkey, roasted beets, farro and greens; no cheeseburger ingredients). Retained `exp01-085` (rice cooked with creamy chicken instead of original green-bean chicken), `exp01-089` (ground chicken baked as marinara meatballs instead of chicken breast cutlets), and `exp01-100` (roasted ranch chicken and potato wedges instead of original cream-cheese ranch chicken and green beans). This is a targeted flagged-pair editorial determination; a comprehensive food taxonomy/ingredient similarity audit and verified per-serving nutrition remain release gates. No photographs approved or recipes published.

## Complete ingredient screening checkpoint

Compared each of the 110 staged drafts against exactly 166 original built-in recipes using an ingredient-name overlap heuristic (all 18,260 pairs). **23 recipes were flagged for editorial review**, not presumed duplicates. Replaced two particularly overlapping dishes: `exp01-055` Homestyle Beef Pot Roast → Moroccan Apricot Chicken with Couscous; `exp01-083` Salisbury Steak with Mushroom Gravy → Ginger Scallion Beef and Cabbage Bowls. Natural photo briefs were updated with the replacement meals. Remaining flagged pairs require an editorial check of preparation and central dish identity. The algorithm alone does not establish uniqueness. All macros remain rough estimates; 0/110 photographs have been approved or added to live app.
