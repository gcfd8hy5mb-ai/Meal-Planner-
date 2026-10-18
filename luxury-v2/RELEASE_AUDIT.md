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

To enable a disposable run, configure that Actions variable and these six
repository Actions secrets (never paste values into PRs or chat):
`TABLEWISE_FIREBASE_API_KEY`, `TABLEWISE_FIREBASE_PROJECT_ID`,
`TABLEWISE_TEST_A_EMAIL`, `TABLEWISE_TEST_A_PASSWORD`,
`TABLEWISE_TEST_B_EMAIL`, `TABLEWISE_TEST_B_PASSWORD`.
The two existing email/password test identities must start with `tablewise-ci-`,
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

**Release decision:** BLOCKED pending the hosted Firebase/two-account evidence and real iPhone walkthrough. No production promotion authorized. 
