# Tablewise Kroger Worker: safe GitHub deployment preparation

**Status: PREPARATION ONLY.** This repository is public. Do not add an active Worker deployment job until the conditions below are met.

## Current Worker
- Name: `tablewise-kroger`
- Public endpoint: `https://tablewise-kroger.gcfd8hy5mb.workers.dev`
- Working original Tablewise origin: `https://gcfd8hy5mb-ai.github.io`
- Guarded Cloudflare Pages preview origin example: `https://15015936.tablewise-luxury-preview.pages.dev`
- Proof from GitHub Actions preflight: original origin returns CORS allow-origin; Cloudflare Pages preview returned HTTP 204 **without** allow-origin. This is the cause of the preview's failed browser requests.

## Before enabling any deployment

1. **Move the Cloudflare API token from repository secrets to a protected environment secret.** In GitHub Settings → Environments, create `tablewise-kroger-production` with **required reviewers** and allow deployments only from the **guarded integration branch**. Create secret `CLOUDFLARE_API_TOKEN` **inside that environment** by copying the token directly from your secure Cloudflare token creation session, then delete the repository-level `CLOUDFLARE_API_TOKEN`. Do not send token values in chats or commit them to GitHub.
2. If Cloudflare no longer displays the token and it wasn't securely kept, revoke it and create another narrowly scoped token. Do not attempt to recover a masked secret.
3. **Back up exact current Worker source/bindings first, privately.** The currently deployed Worker is in active use. Do not upload script source or secrets to this *public* repository or publicly downloadable Actions artifacts. Preserve Cloudflare's currently active version and verify a rollback plan. Use a private repository or a restricted backup store for any full source snapshot.
4. Confirm which Wrangler account and bindings correspond to this Worker, including encrypted OAuth credentials, KV namespaces and redirects. Never rewrite or replace bindings/secrets merely to repair CORS.
5. Implement the **smallest exact origin allow-list change**. Preserve GitHub Pages; allow only explicitly approved luxury previews (or validate an approved Pages project subdomain through an anchored hostname rule), not `*` or arbitrary `pages.dev` domains. Preserve the OAuth return URL and authenticated Firebase checks.
6. Test OPTIONS `/status` from both approved origins and a negative/unrelated origin. Require exact reflected `Access-Control-Allow-Origin`, `Authorization` allowed header, GET allowed method, and no arbitrary-origin reflection. Verify Safari and existing Home Screen connection.
7. Deployment must use a **manual approval-gated workflow** on the guarded branch only, with no `push` deployment trigger, and hardcode the exact script name. Compare live Worker version before touching it; abort if source/bindings differ from the reviewed backup. Do not deploy on pull requests.
8. After validation, revoke/rotate any extra API tokens. Existing Kroger connection, cart and store state must be preserved.

## Known limitations

A GitHub Actions environment restricts use of **environment secrets** by that job. A token stored as a **repository secret** does not receive that restriction. The token's Cloudflare Workers Editor role may allow editing *more than one Worker* within the account even if the GitHub deployment file targets just `tablewise-kroger`. Approvals and carefully scoped GitHub scripts mitigate unintended deployment but are not equivalent to a Worker-scoped Cloudflare token.

No Worker source, OAuth token, Cloudflare API token, or deployment workflow is included in this preparation change.
