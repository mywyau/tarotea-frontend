import { createError } from "h3";
import { redis } from "~/server/repositories/redis";
import { redactIdentifier } from "../logging/redact";

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetSeconds: number;
};

const FIXED_WINDOW_SCRIPT = `
local current = redis.call("INCR", KEYS[1])
local ttl = redis.call("TTL", KEYS[1])

if current == 1 or ttl < 0 then
  redis.call("EXPIRE", KEYS[1], ARGV[1])
  ttl = tonumber(ARGV[1])
end

return { current, ttl }
`;

function summarizeRateLimitKey(key: string) {
  const match = key.match(/^(.*):(user|guest):(.+)$/);

  if (!match) {
    return {
      limiter: key.split(":").slice(0, -1).join(":"),
      subjectType: "legacy",
      subjectHash: redactIdentifier(key.split(":").at(-1) ?? ""),
    };
  }

  return {
    limiter: match[1],
    subjectType: match[2],
    subjectHash: redactIdentifier(match[3]),
  };
}

export async function rateLimitByUser(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  if (!key || limit <= 0 || windowSeconds <= 0) {
    throw new Error("Invalid rate-limit configuration");
  }

  const [current, ttl] = await redis.eval<[string], [number, number]>(
    FIXED_WINDOW_SCRIPT,
    [key],
    [String(windowSeconds)],
  );
  const remaining = Math.max(0, limit - current);

  return {
    allowed: current <= limit,
    remaining,
    resetSeconds: Math.max(ttl, 0),
  };
}

export async function enforceRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<void> {
  const result = await rateLimitByUser(key, limit, windowSeconds);

  if (!result.allowed) {
    console.warn(
      JSON.stringify({
        event: "rate_limit_rejected",
        ...summarizeRateLimitKey(key),
        limit,
        windowSeconds,
        resetSeconds: result.resetSeconds,
        timestamp: new Date().toISOString(),
      }),
    );

    throw createError({
      statusCode: 429,
      statusMessage: "Too many requests. Please wait a moment and try again.",
    });
  }
}
