# Unused API investigation (2026-04-24)

## Scope

I scanned all `server/api/**` routes and compared them against in-repo call sites (`pages/**`, `components/**`, `composables/**`, `utils/**`, and non-API server code).

## Cleanup completed

Removed four legacy `word-progress` API handlers that were fully commented out and had no active handler export:

- `server/api/word-progress/update.post.ts`
- `server/api/word-progress/update.v2.post.ts`
- `server/api/word-progress/weakest.ts`
- `server/api/word-progress/weakestV2.ts`

These files were effectively dead code and not serving active routes.

## Notes

There are additional routes that appear unused by repository call sites, but some may be triggered by external systems (for example Stripe webhooks or queue/worker callbacks). Those were intentionally not removed in this pass.
