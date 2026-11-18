const SCOPE_WORD_CACHE_VERSION = "v1";

export const SCOPE_WORD_CACHE_TTL_SECONDS = 60 * 10;

export function getScopeWordCacheKey(
  scope: "level" | "topic",
  slug: string,
): string {
  return `scope-words:${SCOPE_WORD_CACHE_VERSION}:${scope}:${slug}`;
}
