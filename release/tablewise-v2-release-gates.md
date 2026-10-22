# Tablewise redesign isolated release candidate

Created from production `main` on 2026-10-22. This branch does not inherit the 133 commits / 170 changed files in draft PR #209.

## Approved scope to selectively import
- Standalone `luxury-v2/` application and direct module dependencies from `release/preview-week-grid-only-20261022`.
- The compact two-week calendar with per-week calorie, protein, carbohydrate and fat summaries.
- Quick Meals (prep + cook <= 30 minutes), high-protein and low-carb filters, Today menu macros.
- The original 166 recipes and their existing photographs must remain intact.
- The 110 staged photographs are retained in `photos/expansion-110-staging-20261022`; promote only after testing mappings and nutrition/recipe release safety.
- Minimal targeted tests and build/deployment configuration required for the redesigned app.

## Excluded from automatic promotion
- Unreviewed Cloudflare Worker edits or deployment
- Broad nutrition/USDA research branches, staged recipe provider services, and unrelated operational files
- Any changes to existing users' Firestore data or Firebase rules without verified migrations

## Release gates
- [ ] Import and verify complete standalone redesign, not just its HTML screen
- [ ] Establish production entry-point cutover from legacy `index.html` with reversible fallback
- [ ] Test new + returning login, user-specific two-week restore, sign-out, A/B switch, persistence and safe save transactions
- [ ] Verify complete original recipe-photo baseline plus reviewed 110 extra photographs without replacing existing assets
- [ ] Validate Safari + Home Screen on physical iPhone; old layout must never flash
- [ ] Verify Week 1 / Week 2 / Both grocery checklists and Kroger callback, store selection and safe cart confirmation
- [ ] Pass PR checks for exact release HEAD; verify secure hosted two-account test evidence
- [ ] Approve rollback, production release and post-deploy smoke check

**DO NOT MERGE OR DEPLOY** this preparation branch until every release gate is completed. `LUXURY_SAVES_RELEASED=false` remains in effect. No data migrations are authorized by this document.
