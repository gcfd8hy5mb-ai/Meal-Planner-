# Tablewise luxury v2 — guarded release audit

**Branch:** `integration/luxury-v2-guarded`. **Production branch:** `main` — unchanged by this audit.

## Automated checks and evidence

The `tests/luxury-release-audit.test.mjs` assertions run inside the existing
`tests/luxury-v2-iphone-journey.test.mjs` CI journey. This covers:
- Standalone luxury page: unique element IDs and all direct JavaScript ID selectors bound to DOM elements
- 166 unique built-in recipes, nonempty ingredients and at least three cooking steps each
- Recipe photo mappings are HTTPS or point to an existing repository asset
- `LUXURY_SAVES_RELEASED=false` remains active; preview changes cannot be silently committed to live Firebase
- Kroger gateway remains authenticated and timeout-bounded; background-to-foreground status refresh does not replay connection/cart actions
- Previously included delayed-response tests for Connect/Disconnect and A→B→A session isolation

This is static/controlled regression evidence only. These checks **cannot** establish real-device browser behavior, remote image availability or visual correctness, live auth isolation, or payment/cart behavior.

## Guarded hosted Firebase test runner

A GitHub Actions workflow at `.github/workflows/hosted-disposable-firebase.yml`
runs on pushes to `integration/luxury-v2-guarded` **only after explicit opt-in**.
Until the repository Actions variable `TABLEWISE_HOSTED_TEST_APPROVED` is set
to `yes`, the hosted job is skipped and no live test writes occur.

To enable a disposable run, configure that Actions variable and use the six
existing secrets in the protected `tablewise-hosted-test` environment (never paste values into PRs or chat):
`TABLEWISE_FIREBASE_API_KEY`, `TABLEWISE_FIREBASE_PROJECT_ID`,
`TABLEWISE_TEST_A_EMAIL`, `TABLEWISE_TEST_A_PASSWORD`,
`TABLEWISE_TEST_B_EMAIL`, `TABLEWISE_TEST_B_PASSWORD`.
The workflow job explicitly selects this environment, so its scoped secrets are available only after its protection rules are satisfied. Confirm the environment allows the guarded integration branch. The two existing email/password test identities must start with `tablewise-ci-`,
be distinct, and have **no pre-existing `users/{uid}` documents**.
The test explicitly refuses to overwrite pre-existing data, uses normal Firebase
client authentication (never admin credentials), and attempts to delete only its
own temporary documents before exiting.

The hosted workflow cannot be considered passed merely because GitHub's
ordinary four PR CI jobs are green or the opt-in job is skipped. Record the
actual hosted job conclusion and review its cleanup outcome before promotion.
Turn the approval variable back off after validation.

Note: GitHub's manual `workflow_dispatch` picker may require a workflow file
on the default branch; the guarded-branch push trigger allows running without
altering production `main` once the Actions configuration is explicitly approved.

## Required hosted/cloud validation before production

1. Test with **two disposable Firebase accounts** (A/B) and two browsers/devices: sign-in, A→B→A switching, strict user-document isolation, session expiry, sign-out and account deletion propagation. Confirm no A data, cache, grocery checklist or Kroger store leaks to B.
2. Use a **disposable Firebase test project or guarded test records**, and validate interrupted transaction/reconnect, conflict detection, backup/export, recovery and verification after save across devices. **Do not enable cloud Save** before this passes.
3. Confirm Cloudflare preview and Kroger Worker configuration: state-bound OAuth callback, valid redirect back to preview, connect/disconnect/status, store lookup, product search, and manual cart confirmation. Exercise network loss and timeout without duplicate cart items; avoid real cart writes unless explicitly authorized.
4. Independently inspect all 166 meal photos in the rendered interface for correct meal, successful network load, cropping and readable text. A mapped asset is not sufficient proof of visual accuracy.

## Exact iPhone-only manual walkthrough (Safari and Home Screen)

1. Open the **guarded preview**, not production, from Safari. Hard reload, close/reopen Home Screen app if available. Confirm **no old layout, flicker, blocked taps, overlap, horizontal overflow**, or strange scrolling.
2. New login then returning login: verify account restore, correct welcome/home meal, profile/settings, top/bottom navigation, and all Change/confirm/cancel/back actions. Sign out and verify private data disappears immediately.
3. Plan **Week 1** and **Week 2** separately; change breakfast/lunch/dinner, select and remove sides, adjust servings, confirm cooking instructions display ingredient amounts and sensible time/temperature, and verify edits do not silently save while gated.
4. Open Grocery list: Week 1 / Week 2 / Both; verify totals and units, category accordion starts collapsed, user choices persist across navigation/reopen, and checkmarks remain account-scoped.
5. Scroll all recipe results and inspect representative images and instructions across all recipe groups; verify missing/mismatched images are recorded with recipe ID.
6. Connect Kroger in the preview with **test credentials**, switch store, search/match ingredients, review UPC/package quantity, manually confirm cart only with explicit authorization, disconnect and reconnect. Background iPhone while status/Connect/Disconnect is pending; check graceful recovery with no duplicate actions.
7. Switch account A→B→A rapidly with Kroger requests pending; verify no cross-account grocery selections, store, recipe plan, history, tokens or prompts. Close and reopen after a network outage.
8. On a second device/browser, validate read-only plan restore and app data isolation. Test cloud-save/recovery **only against approved disposable test records**; production save gate stays off.

**Release decision:** BLOCKED pending real iPhone / second-browser read-only restore, account-switch verification, approved disposable write-recovery test, and Kroger OAuth/cart validation. The hosted two-account test completed successfully as shown by the owner's GitHub Actions screenshot (36 seconds; actual test step green), but that is not equivalent to completing all real-device release gates. No production promotion authorized. 

## Hosted test execution evidence

The guarded push-triggered hosted audit must produce a **successful non-skipped job** before hosted isolation may be marked passed. A skipped job, a successful PR emulator check, or a workflow configured without an approved runner is insufficient. The guarded PR must separately satisfy all four standard CI checks for its exact HEAD SHA before merge.

### Hosted runner dependency setup

The hosted workflow intentionally does not request npm dependency caching or `npm ci`: this repository does not have the lockfile required by those options. It follows the passing Firestore test workflow's bounded `npm install` path. The hosted test remains approval-gated and may still report a separate Firebase or credential error once dependency setup succeeds.

## Hosted audit completion and next safe validation (2026-10-18)

The owner provided a screenshot of a **successful 36-second non-skipped hosted disposable Firebase security audit** after PR #177. The "Test hosted two-account isolation and recovery" step was green (4 seconds). This establishes success for the scripted checks in `tests/hosted-firebase-disposable.test.mjs`, including disposable bidirectional access denials, sign-out denial, transaction verification and conflict backup. It does **not** cover two separate real devices, browser session/caching behavior, Kroger OAuth, or account deletion propagation.

The owner reports resetting the repository Actions opt-in variable `TABLEWISE_HOSTED_TEST_APPROVED` to `no`. Its value was not independently read from GitHub; keep it off between explicitly approved hosted test runs.

**Next read-only real-device walkthrough (no cloud writes):**

1. On the guarded preview, sign in to account A and note the Home dinner, Week 1 / Week 2 plan, and the grocery checklist. Do not record credentials or expose other account data.
2. Open the same guarded preview in a second independent browser/device (Safari versus another browser is acceptable; a second iPhone is better). Sign in to A and verify the **existing cloud plan** loads; the grocery checklist is currently account-scoped **localStorage**, so do not assume it syncs across devices.
3. Sign out on the second browser, then sign in to B. Verify A's plan, Kroger store and grocery states are not visible to B. Switch B → A again and verify the correct plan returns.
4. Close and reopen the browser. Ensure only the current account's plan appears, and that no false `No dinner selected` flashes during authenticated restore.
5. Test network outage and return while on the guarded preview. Verify that an interrupted request cannot overwrite a newer plan, that errors are visible, and that cloud **Save changes** remains disabled.

Stop and record any unexpected data sharing, blank screen or missing data. Do not unlock the luxury cloud Save gate or write to actual accounts for this walkthrough. A full cross-device write/recovery test requires a separately approved disposable-record procedure.

## Read-only Kroger Worker CORS probe

The guarded `Luxury v2 design isolation` job now sends unauthenticated `OPTIONS /status` preflight requests to the existing Kroger Worker from GitHub Actions, simulating the existing GitHub Pages origin and two Cloudflare Pages preview origins. It logs HTTP response status and CORS allow-origin/method/header metadata, without credentials, Firebase writes, OAuth, or cart actions. Results are diagnostic only: a passing CI job is **not** proof that Kroger sign-in works in Safari. The Worker itself has not been edited or deployed. If preview origins are rejected while the Home Screen origin is accepted, fix the Worker's exact allow-list and preserve its authenticated request behavior; do not use unrestricted production CORS.\n
## Worker deployment security (preparation only)

The Tablewise GitHub repository is public, and a user-created Cloudflare API token was initially saved as a **repository secret**. Before writing any deploy workflow, move that credential to an approval-protected **environment secret** and delete the repository-level copy. See `ops/tablewise-kroger/SAFE_DEPLOYMENT_SETUP.md`. No Worker code or Cloudflare settings are changed by this audit entry. The Kroger CORS failure is confirmed by the read-only OPTIONS probe; the existing Worker must first be backed up privately and compared with the live version before any approved deployment.

## Worker read-only baseline verification (2026-10-18)

The existing Worker source is **already tracked** at `cloudflare/kroger/worker.js` in this public repository. This is a source baseline only and does not prove byte-identical correspondence to the active Cloudflare-deployed bundle. No secret values should be committed. The new guarded `Kroger Worker live fingerprint (read only)` workflow GETs the deployed script using the `tablewise-kroger-production` environment token, hashes it in ephemeral CI memory, and logs only size/digests. No Worker code is uploaded or printed, no OAuth or cart endpoint is called, and no deployment can happen in this job. Cloudflare's active version remains the fallback rollback point.

**Deployment stays BLOCKED:** A digest is not a complete privately held backup or verified restorable release. Before introducing any write-capable GitHub workflow, independently preserve the exact deployed source, settings, bindings and rollback procedure in a restricted location, confirm environment approval protection, and review an exact Worker diff. The existing environment currently has one guarded branch allowlisted but no confirmed required reviewers; its branch restriction alone is not an explicit human approval mechanism. Public repository Actions code must not expose or broadly reuse the token.
