import { redis } from "~/server/repositories/redis";

export async function getHashFieldsAndRefreshExpiry(
  key: string,
  fields: string[],
  ttlSeconds: number,
): Promise<unknown> {
  if (!key || fields.length === 0 || ttlSeconds <= 0) {
    throw new Error("Invalid Redis hash cache configuration");
  }

  const results = await redis
    .multi()
    .hmget(key, ...fields)
    .expire(key, ttlSeconds)
    .exec();

  return results[0];
}

export async function setHashFieldsWithExpiry(
  key: string,
  fields: Record<string, string>,
  ttlSeconds: number,
): Promise<void> {
  if (!key || ttlSeconds <= 0) {
    throw new Error("Invalid Redis hash cache configuration");
  }

  if (Object.keys(fields).length === 0) {
    return;
  }

  await redis
    .multi()
    .hset(key, fields)
    .expire(key, ttlSeconds)
    .exec();
}
