# USDA portion-weight review (run 39653121355)

The USDA food-detail workflow returned 17 portion rows across 5 foods. Its first-pass matcher reported 6 of 12 ingredient/unit pairs with candidate portion records. Inspection shows why **a matching unit word is not enough to approve a weight**.

| Ingredient and recipe unit | USDA food record | Portion finding | Disposition |
| --- | --- | --- | --- |
| Bread crumbs / Breadcrumbs / Dry breadcrumbs — cup | 174928, plain dry grated bread crumbs | 1 cup = 108 g | Candidate for **plain dry grated** crumbs only; confirm recipe variant before approval |
| Jalapeño — each | 168576, raw jalapeño pepper | 1 pepper = 14 g | Candidate; check recipe's edible pepper size |
| Lemons — each | 2709168, raw lemon | 1 fruit = 65 g | Candidate; confirm whether recipe calls for whole edible lemon, juice, or zest |
| Dry orzo — cup | 169736, generic enriched dry pasta | Only cups of shells, rotini, elbows, spaghetti, penne, farfalle and lasagna | **Reject for orzo**; different pasta shapes pack differently |
| Apples — each | 1750340, raw Fuji apples | 140 g is a RACC portion, **not one apple** | **Reject as each** |
| Dry fettuccine / Dry linguine — oz | 169736, generic enriched dry pasta | Mass-unit conversion is exact: 1 oz = 28.349523125 g | Mass conversion can be proposed, but pasta ingredient composition still needs review |
| Achiote paste — tbsp | No suitable source | No portion | Blocked |
| Dried guajillo chiles — each | No exact food identity | No portion | Blocked |
| Panko breadcrumbs — cup | No confirmed panko source | No portion | Blocked |

No recipe nutrition is approved. All 110 recipes remain staged for the redesigned Tablewise app; the live app is unchanged.
