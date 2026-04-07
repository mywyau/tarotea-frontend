import { createError } from "h3";
import { redis } from "~/server/repositories/redis";

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetSeconds: number;
};

export async function rateLimitByUser(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const current = await redis.incr(key);

  if (current === 1) {
    await redis.expire(key, windowSeconds);
  }

  const ttl = await redis.ttl(key);
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
    throw createError({
      statusCode: 429,
      statusMessage: "Too many requests. Please wait a moment and try again.",
    });
  }
}