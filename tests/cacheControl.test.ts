import { describe, expect, it } from "vitest";
import {
  PRIVATE_API_CACHE_CONTROL,
  PUBLIC_CONTENT_CACHE_CONTROL,
} from "../server/utils/cacheControl";

describe("cache control policy", () => {
  it("prevents API responses from being stored by default", () => {
    expect(PRIVATE_API_CACHE_CONTROL).toBe("private, no-store");
  });

  it("uses bounded browser and shared-cache lifetimes for public content", () => {
    expect(PUBLIC_CONTENT_CACHE_CONTROL).toContain("max-age=60");
    expect(PUBLIC_CONTENT_CACHE_CONTROL).toContain("s-maxage=600");
    expect(PUBLIC_CONTENT_CACHE_CONTROL).toContain(
      "stale-while-revalidate=86400",
    );
  });
});
