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

## Editorial review of remaining 21 ingredient-overlap flags

Reviewed the remaining flagged new recipes against corresponding originals for central protein, form of dish, cooking method, and dominant sauce or starch.

- **Distinct preparations retained:** exp01-001 birria beef tacos (chile-braised beef versus basic beef tacos); 002 carne asada tacos (marinated grilled beef versus chicken street tacos); 003 carnitas (slow-cooked pork versus quick tacos); 007 ground beef taco skillet (one-pan mixture versus handheld tacos); 012 chicken chimichangas (filled/fried burritos versus tacos); 013 beef stuffed peppers (peppers as edible vessel versus burritos); 021 steak nachos (chips and steak versus taco casserole); 026 salsa-verde chicken tacos (green-sauce braise versus plain chicken tacos); 031 steak and pinto burritos (beef and bean flour-tortilla burritos versus quesadillas); 033 beef stuffed zucchini (vegetable boats instead of bean burritos); 034 al pastor pork (marinated pork instead of chicken street tacos); 036 quesabirria (cheese-and-braised beef folded tacos versus basic tacos); 038 chorizo breakfast tacos (eggs and chorizo versus quesadillas); 040 Baja fish tacos (grilled fish and slaw versus shrimp); 053 cheddar-biscuit breakfast bake (egg and ham/biscuit casserole versus sausage gravy biscuit bake); 058 one-pot chicken Alfredo (fettuccine cooked with cream and Parmesan versus creamy garlic chicken without pasta); 062 lemon herb sheet-pan chicken and potatoes (roasting with citrus versus pork/potato meals); 078 white chicken chili (white beans and chiles versus ranch chicken); 079 meatball subs (baked meatballs, tomato sauce and hoagie versus meatloaf/spaghetti); 085 creamy garlic chicken and rice (rice absorbed in cream and chicken broth versus vegetable side dish chicken); 092 Greek lemon chicken soup (egg-lemon tempered broth with rice versus ordinary vegetable soup).
- **Outcome:** None of these 21 were found to be substantially identical to the original recipes based on available ingredient lists and recipe descriptions. They were retained. This review is editorial judgment, not a certification of nutritional accuracy or licensed photographs.
- **Next release gates:** calculate reliable per-serving macro values (currently unverified estimates), produce and inspect 110 individual matching natural-light photographs, integrate with app and grocery system, pass CI and iPhone verification. Keep draft PR #200 unmerged.
