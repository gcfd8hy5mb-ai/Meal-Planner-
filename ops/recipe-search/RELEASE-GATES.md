# Tablewise online recipe discovery — release gates

Status: **not activated**. The existing local pantry search works, but external recipes remain disabled by `ONLINE_RECIPE_SEARCH_ENABLED=false`.

## Implemented
- `functions/api/recipes.js`: an isolated Cloudflare Pages Function route at `/api/recipes`. No separate Cloudflare Worker is required.
- `ops/recipe-search/worker.mjs`: validates read-only parameters, allowed origins, and request bounds; absent a key it returns HTTP 503 and does not call TheMealDB.
- `luxury-v2/online-recipe-provider.mjs`: provider adapter with bounded lookup calls and recipe instructions.
- `luxury-v2/online-recipe-client.mjs`: same-origin client contract, explicitly disabled.

## Must pass before activation
1. Verify Cloudflare Pages build has actually published the Function route and that unconfigured requests return HTTP 503 (not a 404). Check production AND preview routing.
2. Verify API access terms and get a production supporter key from TheMealDB. Never use developer key `1` publicly, and never commit an API key.
3. Configure `RECIPE_API_KEY` as an encrypted **Pages project** runtime secret, not on the existing Kroger Worker. Redeploy the Pages site after adding the binding.
4. Provision a Cloudflare-compatible distributed rate limiting binding named `RECIPE_RATE_LIMITER` for the Pages Function, configured with a documented per-client budget (suggested initial 10 requests/minute). The server **fails closed** with HTTP 503 when the binding or connecting-IP signal is absent, and returns HTTP 429 when quota is exceeded. Unit tests mock the binding; they do not prove production binding support or enforcement. If Pages does not support the required binding, use an independently deployed rate-limited endpoint instead; never silently use process-local counters. Origin/referrer checks alone are not authentication and cannot enforce quotas.
5. Confirm results for each supported cuisine/category. Some listed UX types do not map directly to TheMealDB filter endpoints; implement accurate filtering rather than returning unrelated meals.
6. Review ingredient synonym matching, food allergies, missing ingredient counts, recipe instructions/attribution, and licenses. Keep provider responses rendered using safe DOM text.
7. Activate through a separate reviewed commit only after successful tests, safe failure behavior, and iPhone validation. Do not change original Tablewise app or `tablewise-kroger`.

## Data and plan safety

Online discovery must not alter saved two-week plans or grocery checkmarks automatically. Any adding to plan or groceries should be explicit and tested for account isolation.
