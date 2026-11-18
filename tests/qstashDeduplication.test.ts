import { describe, expect, it } from "vitest";
import { createQstashDeduplicationId } from "../server/utils/qstash/deduplication";

describe("createQstashDeduplicationId", () => {
  it("creates a stable ID from a prefix and persisted identifiers", () => {
    expect(createQstashDeduplicationId("sentence-level", "user-1", 42)).toBe(
      "sentence-level__user-1__42",
    );
  });

  it("replaces characters that are unsafe in a QStash header value", () => {
    expect(
      createQstashDeduplicationId(
        "daily vocab",
        "auth0|user@example.com",
        "attempt/one",
      ),
    ).toBe("daily_vocab__auth0_user_example.com__attempt_one");
  });
});
