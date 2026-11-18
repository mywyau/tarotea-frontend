# Delivery baseline

Captured: 2026-11-18
Source commit: `5453e7a` plus the uncommitted scale-readiness batch
Command: `npm run build`
Preset: Vercel

## Local production build

| Signal | Size |
| --- | ---: |
| JavaScript assets, uncompressed aggregate | 1,033,753 bytes |
| CSS assets, uncompressed aggregate | 171,507 bytes |
| JavaScript plus CSS, uncompressed aggregate | 1,205,260 bytes |
| Largest JavaScript chunk | 385,345 bytes; 129.44 kB gzip |
| Main CSS asset | 171,507 bytes; 21.00 kB gzip |
| Built server output | 9.35 MB; 2.24 MB gzip |

The aggregate client number is a regression reference, not an initial-page
download estimate: Nuxt route splitting means a browser loads only the chunks
needed by a journey. Hashed filenames are intentionally omitted because they
change between builds.

## Production measurements still required

- transferred bytes for landing, topic, quiz, dojo, and account journeys;
- largest API response and p95 response size by route group;
- CDN cache hit/miss/revalidation rates for public learning content;
- cold versus warm server response latency; and
- third-party script transfer and main-thread cost.

Capture these during the approved production baseline and link the dated report
from `tarotea-performance-tests/reports/`. Do not broaden HTML caching solely
from local build sizes; confirm that auth/session rendering cannot be shared.
