import { describe, expect, it } from "vitest";
import {
  BILLING_SESSION_RATE_LIMIT,
  DAILY_FINALIZATION_RATE_LIMIT,
} from "../server/utils/rate-limiting/policies";

describe("rate-limit policies", () => {
  it("permits UI retries while bounding external billing session creation", () => {
    expect(BILLING_SESSION_RATE_LIMIT).toEqual({
      limit: 10,
      windowSeconds: 60,
    });
  });

  it("bounds both daily finalizers as one write-heavy route group", () => {
    expect(DAILY_FINALIZATION_RATE_LIMIT).toEqual({
      limit: 10,
      windowSeconds: 60,
    });
  });
});
