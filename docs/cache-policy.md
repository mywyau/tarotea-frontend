# Cache policy and invalidation

Last reviewed: 2026-11-18

## Principles

- Every per-user or content cache has a bounded lifetime.
- Content-key namespaces are versioned so incompatible payload changes can be invalidated without scanning Redis.
- Authoritative mutations update or delete related caches in the same application flow.
- Redis is an optimization for recoverable content and progress reads, but a correctness dependency for short-lived quiz sessions, distributed locks, and rate limits.
- Logs must identify the cache class and operation without exposing user IDs, session IDs, or cached payloads.

## Active cache classes

| Cache class | Key pattern | Lifetime | Invalidation / refresh | Redis failure behavior |
| --- | --- | --- | --- | --- |
| Topic content | `topic-content:v1:<slug>` | 10 minutes | TTL or increment namespace version after a schema-breaking content change | Read/write errors fall back to the CDN; concurrent misses in one server instance are coalesced |
| Level typing content | `dojo:typing:level:content:v1:<slug>` | 10 minutes | TTL or increment namespace version | Read/write errors emit a sanitized event and fall back to the CDN |
| Sentence typing content | `dojo:sentence:content:v1:<scope>:<slug>` | 10 minutes; one-minute local copy | TTL or increment namespace version; local entries expire independently | Read/write errors emit a sanitized event and fall back to local/CDN content |
| Level/topic scope word IDs | `scope-words:v1:<scope>:<slug>` | 10 minutes | TTL or increment namespace version | Read/write errors fall back to PostgreSQL/CDN-derived scope loading |
| Word progress | `word_progress:<user>` | 7 days | XP workers write updated fields and renew TTL | Reads fall back to PostgreSQL; cache-write failure does not invalidate the committed database mutation |
| Sentence progress | `sentence_progress:<user>` | 7 days | Sentence XP workers write updated fields and renew TTL | Reads fall back to PostgreSQL; cache-write failure does not invalidate the committed database mutation |
| Word unlocks | `user:unlocks:<user>` plus hydration marker | 7 days | Unlock mutation updates the set and marker transactionally; otherwise rehydrate after TTL | Reads rehydrate from PostgreSQL; Redis failure can still fail the request and should be made explicit |
| Quiz/dojo sessions | Quiz-specific user/session keys | 30 minutes | Worker deletes completed sessions where implemented; TTL bounds abandoned sessions | Fail closed because workers require the server-created allow-list for integrity |
| Pronunciation lock | `lock:pronunciation:<subject>` | 30 seconds | Released after request; TTL recovers crashed requests | Fail closed to avoid concurrent provider usage and duplicate charging |
| Rate limits | `rl:<class>:<subject>` | Endpoint window | Atomic script increments and assigns/repairs expiry | Fail closed today; an outage policy must be chosen per endpoint class |

## Invalidation procedure

1. For content payload changes that remain backward-compatible, publish content and allow the ten-minute TTL to refresh it.
2. For incompatible content shapes, increment the relevant namespace version in code and deploy it with the consumer change.
3. For incorrect personalized data, repair the authoritative PostgreSQL row first, then delete the affected progress/unlock key.
4. Never bulk-delete Redis keys without resolving an exact namespace and confirming the database or CDN is authoritative.
5. After invalidation, verify one cold request, one cache-hit request, and the relevant mutation/worker path.

## Remaining work

- Decide fail-open versus fail-closed behavior for each rate-limit class during a Redis outage.
- Add cache hit/miss/write-failure counters and Redis commands-per-journey measurements.
- Consider distributed single-flight locking only if production measurements show cross-instance CDN stampedes.
