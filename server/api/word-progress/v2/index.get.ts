// server/api/word-progress/v2/index.get.ts

import { createError, getQuery } from "h3";
import { db } from "~/server/repositories/db";
import { redis } from "~/server/repositories/redis";
import { requireUser } from "~/server/utils/requireUser";

type WordProgress = {
  xp: number;
  streak: number;
};

function parseCachedWordProgress(raw: unknown): WordProgress | null {
  if (!raw || typeof raw !== "string") return null;

  try {
    const parsed = JSON.parse(raw) as {
      xp?: unknown;
      streak?: unknown;
    };

    return {
      xp: Number(parsed.xp ?? 0),
      streak: Number(parsed.streak ?? 0),
    };
  } catch {
    return null;
  }
}

export default defineEventHandler(async (event) => {
  const userId = await requireUser(event);

  const query = getQuery(event);
  const wordIdsParam = query.wordIds;

  if (!wordIdsParam || typeof wordIdsParam !== "string") {
    throw createError({
      statusCode: 400,
      statusMessage: "wordIds query param required",
    });
  }

  const wordIds = [...new Set(
    wordIdsParam
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)
  )];

  if (!wordIds.length) {
    return {};
  }

  const redisKey = `word_progress:${userId}`;
  const progressMap: Record<string, WordProgress> = {};

  let cachedById: Record<string, unknown> = {};

  try {
    const result = await redis.hmget(redisKey, ...wordIds);

    if (Array.isArray(result)) {
      cachedById = Object.fromEntries(
        wordIds.map((id, i) => [id, result[i] ?? null]),
      );
    } else {
      cachedById = (result ?? {}) as Record<string, unknown>;
    }
  } catch (error) {
    console.error("[word-progress] Redis HMGET failed", error);
    cachedById = {};
  }

  const missingIds: string[] = [];

  for (const wordId of wordIds) {
    const cached = parseCachedWordProgress(cachedById[wordId]);

    if (cached) {
      progressMap[wordId] = cached;
    } else {
      missingIds.push(wordId);
    }
  }

  if (missingIds.length === 0) {
    return progressMap;
  }

  const { rows } = await db.query(
    `
    select word_id, xp, streak
    from user_word_progress
    where user_id = $1
      and word_id = any($2::text[])
    `,
    [userId, missingIds],
  );

  const foundIds = new Set<string>();
  const redisWrites: Record<string, string> = {};

  for (const row of rows) {
    const progress: WordProgress = {
      xp: Number(row.xp ?? 0),
      streak: Number(row.streak ?? 0),
    };

    foundIds.add(row.word_id);
    progressMap[row.word_id] = progress;

    redisWrites[row.word_id] = JSON.stringify(progress);
  }

  // Cache zero/default progress too so we avoid repeated DB misses
  for (const wordId of missingIds) {
    if (foundIds.has(wordId)) continue;

    const zeroProgress: WordProgress = {
      xp: 0,
      streak: 0,
    };

    progressMap[wordId] = zeroProgress;
    redisWrites[wordId] = JSON.stringify(zeroProgress);
  }

  try {
    if (Object.keys(redisWrites).length > 0) {
      await redis.hset(redisKey, redisWrites);
    }
  } catch (error) {
    console.error("[word-progress] Redis HSET failed", error);
  }

  return progressMap;
});