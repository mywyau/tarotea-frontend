import { describe, expect, it } from "vitest";
import { getRateLimitSubject } from "../server/utils/rate-limiting/subject";

function eventWithForwardedIp(ip?: string) {
  return {
    context: {},
    node: {
      req: {
        headers: ip ? { "x-forwarded-for": ip } : {},
        socket: {},
      },
    },
  } as Parameters<typeof getRateLimitSubject>[0];
}

describe("getRateLimitSubject", () => {
  it("uses a stable authenticated-user namespace", () => {
    expect(getRateLimitSubject(eventWithForwardedIp("203.0.113.1"), " user-1 "))
      .toBe("user:user-1");
  });

  it("keeps anonymous IP addresses in independent guest buckets", () => {
    expect(getRateLimitSubject(eventWithForwardedIp("203.0.113.1"), null))
      .toBe("guest:203.0.113.1");
    expect(getRateLimitSubject(eventWithForwardedIp("203.0.113.2"), null))
      .toBe("guest:203.0.113.2");
  });

  it("uses an explicit fallback when no request address is available", () => {
    expect(getRateLimitSubject(eventWithForwardedIp(), null))
      .toBe("guest:unknown");
  });
});
