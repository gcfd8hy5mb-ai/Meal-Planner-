# Production cutover readiness — Tablewise redesign

Verified on 2026-10-22:
- Isolated release smoke CI and Firestore rule checks passed on commit `5a81a7cf673e044a7035d07f04553911775c6461`.
- Cloud writes remain disabled in `luxury-v2/live.js` (`LUXURY_SAVES_RELEASED=false`).
- 110 approved photos are present in the isolated release with validated pairing to draft recipe records.
- New 110 recipes remain draft-only with estimated nutrition and are not yet in the active catalog.
- The live `index.html` has not been changed.

## Required before approving the production cutover
1. Verify actual user sign-in and cloud plan restore with existing valid account and a separate disposable second account. Check A → B → A switches and no data leakage.
2. Validate a complete two-week edit/save/reload cycle against **disposable** Firebase records, with conflict detection, rollback, and read-after-write confirmation. Only then consider enabling production cloud writes.
3. Validate Kroger login redirect, saved store, product matching and manual cart submission against authorized test account on actual preview URL.
4. Validate iPhone Safari and Home Screen, no old UI flash, small viewport layout, grocery collapse/selection retention, quick meal filters and two-week calendar.
5. Review release entry-point strategy: redirect/replace `index.html` with tested v2 only after complete feature and state parity. Preserve an immutable rollback version of original UI.
6. Run all release tests against exact final SHA and verify production smoke results. Make release approval explicit.

**HOLD:** Tests here are not proof of real-device verification or functional cloud saving. Keep `main` intact and PR #210 draft.
