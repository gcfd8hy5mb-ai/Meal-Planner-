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

**Present implementation status (PR #71):** The prototype now has a read-only authenticated account adapter, two-week meal editing previews, grocery recalculation, and guarded transaction/save recovery plumbing. The production app remains in `/index.html`. **Luxury cloud Save remains disabled** via `LUXURY_SAVES_RELEASED=false`. Passing emulator CI and Playwright viewport checks are not evidence of hosted Firebase or physical-iPhone validation.

## Remaining hosted-release gate

- Use only explicitly designated disposable test accounts and test meal documents in the real Firebase project; do not run write tests against an existing user's account.
- First confirm the configured Firebase project ID and deployed Firestore rules, then verify that test sign-in is permitted. Never use administrator credentials or service-role bypasses to claim user-level isolation.
- On two independent authenticated sessions, verify exact two-week cloud restore, atomic dual-week changes, and preservation of unrelated profile and grocery state.
- Verify that another user's normal credentials cannot read or write the first user's document.
- Test A→B→A switching, expired sessions, simultaneous edits, connection interruption, reload, backup export, and recovery without silent overwrites or false success.
- Validate on a real iPhone including Home Screen launch, tab navigation, meal editing, grocery updates, and no legacy UI flash during cold start, reload, or interrupted network.
- Before enabling Save or promoting the redesign, capture evidence of successful hosted/device tests, verify rollback, and conduct an explicit production release review.

**Current release decision: HOLD.** An emulator passing does not remove any of the outstanding hosted-device checks.