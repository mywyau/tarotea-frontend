import { describe, expect, it } from "vitest";
import {
  getScopeWordCacheKey,
  SCOPE_WORD_CACHE_TTL_SECONDS,
} from "../server/services/cache/scopeWordCache";

describe("scope word cache policy", () => {
  it("separates level and topic content in a versioned namespace", () => {
    expect(getScopeWordCacheKey("level", "level-one")).toBe(
      "scope-words:v1:level:level-one",
    );
    expect(getScopeWordCacheKey("topic", "survival-essentials")).toBe(
      "scope-words:v1:topic:survival-essentials",
    );
    expect(SCOPE_WORD_CACHE_TTL_SECONDS).toBe(600);
  });
});
