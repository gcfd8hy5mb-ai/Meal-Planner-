# Tablewise luxury redesign — production cutover checklist

Status: **PREPARATION ONLY. NO PRODUCTION CUTOVER IS AUTHORIZED BY THIS DOCUMENT.**

## Verified baselines (2026-10-25)
- Existing live GitHub Pages application: `main/index.html`, blob `a143c207f909f5f0fd7cece34f62827d1ab56f54` on `main` commit `542efbfbb28adf807b219d9d096622a7a5ff2250`.
- Approved luxury candidate branch: `release/tablewise-v2-minimal-20261022`, commit `b67fceb0b4a734f8b751909e417aeaf00975a3a1`.
- Separate Cloudflare Pages project: `tablewise-luxury-preview`. The last checked preview deployment, workflow run 40226963137, succeeded. This does not prove a subsequent edit has been deployed.
- User has confirmed on-device meal saving, both weeks, groceries, macros, and photos; do not treat this as a production acceptance test.
- Current preview workflow explicitly publishes ONLY to `tablewise-luxury-preview`, and never to GitHub Pages or the Kroger Worker.

## Release blockers to resolve before cutover
1. Decide **one** canonical live origin and app path (GitHub Pages vs a new production Cloudflare Pages project); do not point the preview domain at production.
2. Verify the actual existing live URL, DNS/custom domain, PWA scope/service-worker cache behavior, and Home Screen upgrade/migration path on iPhone. Do not assume storage or service worker state transfers between origins.
3. Prepare a complete immutable deployment artifact from the approved luxury commit, including `luxury-v2/` and `assets/`. Test each relative path under the chosen production base URL. Confirm Firebase authorized domains and login callback behavior for that origin.
4. Review Firestore document compatibility, rules, and any pre-existing account records. Do not bulk migrate, clear, or overwrite records. Test one disposable account for reload/save/conflict/account switch using the target origin.
5. Verify Kroger connection/cart requests under the production origin. Preserve existing Worker and tokens; no Worker deployment.
6. Execute all release smoke, security, recipe-photo mapping, grocery, macro, and Firebase save/readback tests against the **exact** release artifact. Verify actual photo fetches over HTTPS and fallback.
7. Prepare an explicit restore path: preserve production commit/artifact and current DNS/pages settings; independently verify ability to restore older index/assets and invalidate stale PWA caches. Record deployment ID and before/after versions.
8. Schedule approval/rollout after the above evidence is captured; never silently deploy a draft or copy preview test data.

## Cutover sequence (requires separate explicit approval)
- Freeze the tested luxury commit and archive the existing production deployment source/artifact.
- Deploy to a production **staging URL**, separate from both existing live and luxury preview, with production-like path and auth configuration.
- Validate sign-in, two weeks, recipe details/photos, grocery persistence, Kroger connect/cart (using a disposable account), and saving/reload on an iPhone.
- When approved, promote the immutable artifact to the chosen live origin, not the preview origin. Do not change Firebase rules or Kroger Worker in this step.
- Immediately run anonymous and authenticated post-deploy checks; verify service-worker/PWA upgrade behavior; observe error logs before calling the release complete.

## Rollback trigger and procedure
If sign-in, account isolation, saves, existing plans, recipe photos, or Kroger cart fails: halt rollout; restore the recorded previous production artifact/origin configuration; check active service-worker caches and perform post-rollback login/read-only checks. Do not revert or delete user Firebase records to roll back a front-end change.

## Scope of this PR
Documentation only. No code changes to the public app, Firebase, Cloudflare, Kroger Worker, DNS, or GitHub Pages.

## Additional Home Screen assessment (2026-10-25)
- Inspected `main/index.html` and standalone `luxury-v2/index.html`: neither referenced a web-app manifest or `navigator.serviceWorker` / `serviceWorker.register` in the checked content.
- Common root-level manifest/service-worker filenames (`manifest.webmanifest`, `manifest.json`, `sw.js`, `service-worker.js`) were not found on `main`. This **does not rule out** external caching, files in alternate directories, or iOS standalone bookmark behavior.
- iPhone "Add to Home Screen" links may remain pinned to their original URL/origin. **Do not assume** replacing GitHub Pages with a separate Cloudflare URL updates the installed shortcut or carries localStorage over. Firebase data is account-based and may be shared only after validating auth origin and access.
- Production release decision remains blocked until the canonical destination URL and iPhone shortcut migration behavior are verified in staging, including existing user accounts and local grocery-checklist state.
