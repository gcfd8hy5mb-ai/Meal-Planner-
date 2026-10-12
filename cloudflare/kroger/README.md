# Kroger Worker deployment preparation

This folder holds the Kroger OAuth backend for the Tablewise / Meal Planner app.

## Safety
- The source is staged on the `prepare-kroger-worker-github` branch, not `main`.
- Do not connect this branch to automatic Cloudflare production builds yet.
- Existing Worker: `tablewise-kroger` (confirm exact Worker name in Cloudflare).
- Source entry point: `cloudflare/kroger/worker.js`.
- Cloudflare secrets remain configured in Cloudflare; never commit their values:
  `KROGER_CLIENT_ID`, `KROGER_CLIENT_SECRET`, `KROGER_TOKEN_ENCRYPTION_KEY`.
- Existing KV binding name expected in Worker: `KROGER_KV`. Confirm namespace ID via Cloudflare Settings before adding Wrangler config.
- Confirm whether the exact application callback URL `https://<your-worker-host>/auth/kroger/callback` is registered in Kroger developer settings.

## Before production Git builds
1. Back up the deployed Worker and inspect its bindings (including KV namespace ID) in Cloudflare.
2. Add a Wrangler configuration referencing `cloudflare/kroger/worker.js`, the existing Worker name, existing KV namespace, and compatibility date. Do not invent the namespace ID.
3. Validate syntax and mock-test `/health`, CORS, Firebase token rejection, and OAuth callback handling.
4. Verify Kroger OAuth against approved test credentials, as available.
5. Ensure deploying this Worker will not replace or remove unrelated backend handlers.
6. Only then enable Git production deployment for the correct repo/branch.

The Worker has `/health`, `/connect`, `/status`, `/disconnect`, and `/auth/kroger/callback`. It does NOT yet implement the full product/cart workflow.
