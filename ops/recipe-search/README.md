# Separate Tablewise recipe Worker — NOT DEPLOYED

Dedicated Worker name: `tablewise-recipe-search`. This is **not** the existing `tablewise-kroger` Worker.

The Wrangler configuration in this directory is deliberately isolated from the root `wrangler.jsonc`. It has `workers_dev: false`, no public routes, and a built-in 10-requests-per-minute rate limiting binding. Cloudflare rate limiting is approximate, not a billing quota.

The Cloudflare Pages `/api/recipes` Function expects a service binding named `TABLEWISE_RECIPE_SERVICE` targeting `tablewise-recipe-search`. Until that binding is provisioned the route returns **503**, as it does today. Keep the client feature flag disabled.

**Do not run a deployment command yet.** Before deployment, independently review the rate-limit namespace ID for conflicts, enable a provider account with suitable production terms, set `RECIPE_API_KEY` on the **dedicated** Worker (not Pages or Kroger), verify a hard usage/billing cap, and separately authorize deployment.

Local tests do not prove a production account's rate-limit binding is working. After provisioning, verify 200/429/503 behaviors, identity isolation, accurate cuisine results, license/attribution, and original preview stability.

Do not modify the original Tablewise live app, its Firebase plans, or Kroger Worker.
