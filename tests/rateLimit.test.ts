import { beforeEach, describe, expect, it, vi } from "vitest";

const redisEvalMock = vi.fn();

vi.mock("~/server/repositories/redis", () => ({
  redis: {
    eval: redisEvalMock,
  },
}));

const { enforceRateLimit, rateLimitByUser } = await import(
  "../server/utils/rate-limiting/rateLimit"
);

describe("rate limiting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("increments and expires a fixed window atomically", async () => {
    redisEvalMock.mockResolvedValue([1, 60]);

    await expect(rateLimitByUser("rl:test:user-1", 20, 60)).resolves.toEqual({
      allowed: true,
      remaining: 19,
      resetSeconds: 60,
    });

    expect(redisEvalMock).toHaveBeenCalledOnce();
    expect(redisEvalMock).toHaveBeenCalledWith(
      expect.stringContaining('redis.call("EXPIRE"'),
      ["rl:test:user-1"],
      ["60"],
    );
  });

  it("rejects requests beyond the configured limit", async () => {
    redisEvalMock.mockResolvedValue([21, 12]);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    await expect(
      enforceRateLimit("rl:test:user:user-1", 20, 60),
    ).rejects.toMatchObject({
      statusCode: 429,
    });

    expect(warn).toHaveBeenCalledOnce();
    const event = JSON.parse(String(warn.mock.calls[0]?.[0]));
    expect(event).toMatchObject({
      event: "rate_limit_rejected",
      limiter: "rl:test",
      subjectType: "user",
      limit: 20,
      windowSeconds: 60,
      resetSeconds: 12,
    });
    expect(warn.mock.calls[0]?.[0]).not.toContain("user-1");

    warn.mockRestore();
  });

  it("rejects invalid limiter configuration before calling Redis", async () => {
    await expect(rateLimitByUser("", 20, 60)).rejects.toThrow(
      "Invalid rate-limit configuration",
    );
    await expect(rateLimitByUser("rl:test:user-1", 0, 60)).rejects.toThrow(
      "Invalid rate-limit configuration",
    );
    await expect(rateLimitByUser("rl:test:user-1", 20, 0)).rejects.toThrow(
      "Invalid rate-limit configuration",
    );

    expect(redisEvalMock).not.toHaveBeenCalled();
  });
});
