# Luxury v2 visual isolation contract

The production app remains in `/index.html`. The redesign prototype lives in `/luxury-v2/index.html`, a **separate HTML document** without importing any legacy stylesheets, scripts, components or markup.

## Non-negotiable release rules

1. Never inject legacy HTML into the new document.
2. Never import old styles, fonts, CSS variables, base reset, layout classes, or text labels. Rebuild the four navigation destinations as independent v2 components using a fresh design token system.
3. Only reuse data and state through an explicit normalized adapter, not DOM copying, innerHTML extraction, CSS selectors, or legacy rendering functions.
4. Verify computed typography, padding, margins, card dimensions, header, bottom navigation, dialogs, and safe-area handling at iPhone viewport sizes.
5. Add automated static checks to block imports of legacy files or HTML, and visual snapshots checking all four screens. Test authenticated cloud restoration, meal edits, grocery list and cook step navigation before promotion.
6. No new interface is production-ready until photos correspond to the actual dishes and recipe data is wired. Placeholder or demo UI must not replace working production features.
7. Keep production app unchanged until all regression and accessibility checks pass, followed by deliberate cutover and rollback plan.

**Present implementation status:** isolated *static prototype*, not functional integration. This document tracks acceptance criteria and must not be interpreted as successful testing of the future data adapter.
