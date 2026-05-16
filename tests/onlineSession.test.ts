import { describe, expect, it } from "vitest";
import { normalizeOnlineSessionId } from "../server/utils/onlineSession";

describe("online session validation", () => {
  it("accepts and normalizes UUID session ids", () => {
    expect(
      normalizeOnlineSessionId("  550E8400-E29B-41D4-A716-446655440000  "),
    ).toBe("550e8400-e29b-41d4-a716-446655440000");
  });

  it("rejects empty, non-string, oversized, and non-UUID values", () => {
    expect(normalizeOnlineSessionId(123)).toBeNull();
    expect(normalizeOnlineSessionId(" ")).toBeNull();
    expect(normalizeOnlineSessionId("not-a-session")).toBeNull();
    expect(normalizeOnlineSessionId("x".repeat(200))).toBeNull();
  });
});
