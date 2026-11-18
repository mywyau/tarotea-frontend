import { describe, expect, it } from "vitest";
import {
  classifyUpstreamFailure,
  summarizeUpstreamFailure,
} from "../server/utils/upstreamFailure";

describe("classifyUpstreamFailure", () => {
  it("treats provider throttling as retryable", () => {
    expect(classifyUpstreamFailure({ status: 429 })).toEqual({
      retryable: true,
      code: "upstream_rate_limited",
      providerStatus: 429,
      retryAfterSeconds: 30,
    });
  });

  it("treats provider and transport outages as retryable", () => {
    expect(classifyUpstreamFailure({ status: 503 }).retryable).toBe(true);
    expect(
      classifyUpstreamFailure({ name: "APIConnectionTimeoutError" }).retryable,
    ).toBe(true);
    expect(classifyUpstreamFailure({ code: "ECONNRESET" }).retryable).toBe(true);
  });

  it("does not expose an upstream error message in its summary", () => {
    const summary = summarizeUpstreamFailure(
      Object.assign(new Error("sensitive provider response"), {
        status: 400,
        code: "bad_audio",
      }),
    );

    expect(summary).toEqual({
      retryable: false,
      code: "upstream_failure",
      providerStatus: 400,
      errorName: "Error",
      providerCode: "bad_audio",
    });
    expect(summary).not.toHaveProperty("message");
  });
});
