import { SENTENCE_PROGRESS_CACHE_TTL_SECONDS } from "~/config/cache/redis";
import { db } from "~/server/repositories/db";
import { redis } from "~/server/repositories/redis";
import {
  CachedSentenceProgress,
  SentenceProgress,
} from "~/server/services/sentence-quiz/start/types";

function parseCachedProgress(raw: unknown): SentenceProgress | null {
  if (!raw || typeof raw !== "string") return null;

  try {
    const parsed = JSON.parse(raw) as CachedSentenceProgress;

    return {
      seenCount: Number(parsed.seenCount ?? 0),
      lastSeenAt:
        typeof parsed.lastSeenAt === "string" || parsed.lastSeenAt === null
          ? parsed.lastSeenAt
          : null,
    };
  } catch {
    return null;
  }
}

export async function loadSentenceProgressMap(
  userId: string,
  sentenceIds: string[],
): Promise<Map<string, SentenceProgress>> {
  const progressMap = new Map<string, SentenceProgress>();

  if (sentenceIds.length === 0) {
    return progressMap;
  }

  const redisKey = `sentence_progress:${userId}`;

  let cachedById: Record<string, unknown> = {};

  try {
    const result = await redis.hmget(redisKey, ...sentenceIds);

    if (Array.isArray(result)) {
      cachedById = Object.fromEntries(
        sentenceIds.map((id, i) => [id, result[i] ?? null]),
      );
    } else {
      cachedById = (result ?? {}) as Record<string, unknown>;
    }

    try {
      await redis.expire(redisKey, SENTENCE_PROGRESS_CACHE_TTL_SECONDS);
    } catch (error) {
      console.error(
        "[quiz/sentences/start] Redis EXPIRE after HMGET failed",
        error,
      );
    }
  } catch (error) {
    console.error("[quiz/sentences/start] Redis HMGET failed", error);
    cachedById = {};
  }

  const missingIds: string[] = [];

  for (const sentenceId of sentenceIds) {
    const raw = cachedById[sentenceId];

    if (typeof raw !== "string") {
      missingIds.push(sentenceId);
      continue;
    }

    const parsed = parseCachedProgress(raw);

    if (!parsed) {
      missingIds.push(sentenceId);
      continue;
    }

    if (parsed.seenCount > 0 || parsed.lastSeenAt !== null) {
      progressMap.set(sentenceId, parsed);
    }
  }

  if (missingIds.length === 0) {
    return progressMap;
  }

  const { rows } = await db.query(
    `
    select sentence_id, seen_count, last_seen_at
    from user_sentence_progress
    where user_id = $1
      and sentence_id = any($2::text[])
    `,
    [userId, missingIds],
  );

  const foundIds = new Set<string>();
  const redisWrites: Record<string, string> = {};

  for (const row of rows) {
    const progress: SentenceProgress = {
      seenCount: Number(row.seen_count ?? 0),
      lastSeenAt: row.last_seen_at ?? null,
    };

    foundIds.add(row.sentence_id);

    if (progress.seenCount > 0 || progress.lastSeenAt !== null) {
      progressMap.set(row.sentence_id, progress);
    }

    redisWrites[row.sentence_id] = JSON.stringify({
      seenCount: progress.seenCount,
      lastSeenAt: progress.lastSeenAt,
    });
  }

  for (const sentenceId of missingIds) {
    if (foundIds.has(sentenceId)) continue;

    redisWrites[sentenceId] = JSON.stringify({
      seenCount: 0,
      lastSeenAt: null,
    });
  }

  try {
    if (Object.keys(redisWrites).length > 0) {
      await redis.hset(redisKey, redisWrites);

      try {
        await redis.expire(redisKey, SENTENCE_PROGRESS_CACHE_TTL_SECONDS);
      } catch (error) {
        console.error(
          "[quiz/sentences/start] Redis EXPIRE after HSET failed",
          error,
        );
      }
    }
  } catch (error) {
    console.error("[quiz/sentences/start] Redis HSET failed", error);
  }

  return progressMap;
}
