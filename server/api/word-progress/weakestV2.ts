// server/api/word-progress/weakestV2.ts

import { createError, getQuery } from "h3";
import { WORD_PROGRESS_CACHE_TTL_SECONDS } from "~/config/redis";
import { db } from "~/server/repositories/db";
import { redis } from "~/server/repositories/redis";
import { requireUser } from "~/server/utils/requireUser";

type WordProgress = {
  xp: number;
  streak: number;
};

function parseCachedWordIds(raw: unknown): string[] | null {
  if (!raw) return null;

  if (Array.isArray(raw)) {
    return raw.filter(
      (id): id is string => typeof id === "string" && id.length > 0,
    );
  }

  if (typeof raw !== "string") {
    return null;
  }

  const trimmed = raw.trim();
  if (!trimmed) return null;

  // New format: JSON array string
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed)
        ? parsed.filter(
            (id): id is string => typeof id === "string" && id.length > 0,
          )
        : null;
    } catch {
      return null;
    }
  }

  // Legacy format: CSV string
  return trimmed
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

function parseCachedTopicData<T>(raw: unknown): T | null {
  if (!raw) return null;

  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  if (typeof raw === "object") {
    return raw as T;
  }

  return null;
}

// function parseCachedWordProgress(raw: unknown): WordProgress | null {
//   if (!raw || typeof raw !== "string") return null;

//   try {
//     const parsed = JSON.parse(raw) as {
//       xp?: unknown;
//       streak?: unknown;
//     };

//     return {
//       xp: Number(parsed.xp ?? 0),
//       streak: Number(parsed.streak ?? 0),
//     };
//   } catch {
//     return null;
//   }
// }

function parseCachedWordProgress(raw: unknown): WordProgress | null {
  if (!raw) return null;

  let parsed: unknown = raw;

  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }
  }

  if (!parsed || typeof parsed !== "object") {
    return null;
  }

  const xp = Number((parsed as { xp?: unknown }).xp ?? 0);
  const streak = Number((parsed as { streak?: unknown }).streak ?? 0);

  return {
    xp: Number.isFinite(xp) ? xp : 0,
    streak: Number.isFinite(streak) ? streak : 0,
  };
}

async function loadCandidateWordIds(
  levelSlug?: string,
  topicSlug?: string,
): Promise<string[]> {
  if (levelSlug) {
    const cacheKey = `scope_words:level:${levelSlug}`;

    // try {
    //   const cached = await redis.get<string>(cacheKey);
    //   if (cached) {
    //     const parsed = JSON.parse(cached);
    //     if (Array.isArray(parsed)) {
    //       return parsed.filter((id) => typeof id === "string");
    //     }
    //   }
    // } catch (error) {
    //   console.error(
    //     "[word-progress/weakestV2] level scope Redis GET failed",
    //     error,
    //   );
    // }

    try {
      const cached = await redis.get(cacheKey);
      const parsed = parseCachedWordIds(cached);

      if (parsed?.length) {
        return parsed;
      }
    } catch (error) {
      console.error(
        "[word-progress/weakestV2] level scope Redis GET failed",
        error,
      );
    }

    const { rows } = await db.query(
      `
      select distinct w.id
      from words w
      join word_levels wl
        on wl.word_id = w.id
      join levels l
        on l.id = wl.level_id
      where l.slug = $1
      `,
      [levelSlug],
    );

    const ids = rows.map((row) => row.id as string);

    try {
      await redis.set(cacheKey, JSON.stringify(ids));
      // optional TTL:
      // await redis.expire(cacheKey, 60 * 60);
    } catch (error) {
      console.error(
        "[word-progress/weakestV2] level scope Redis SET failed",
        error,
      );
    }

    return ids;
  }

  if (topicSlug) {
    const cacheKey = `scope_words:topic:${topicSlug}`;

    // try {
    //   const cached = await redis.get<string>(cacheKey);
    //   if (cached) {
    //     const parsed = JSON.parse(cached);
    //     if (Array.isArray(parsed)) {
    //       return parsed.filter((id) => typeof id === "string");
    //     }
    //   }
    // } catch (error) {
    //   console.error(
    //     "[word-progress/weakestV2] topic scope Redis GET failed",
    //     error,
    //   );
    // }

    try {
      const cached = await redis.get(cacheKey);
      const parsed = parseCachedTopicData(cached);

      if (parsed) {
        return parsed;
      }
      
    } catch (error) {
      console.error(
        "[word-progress/weakestV2] topic scope Redis GET failed",
        error,
      );
    }

    const { rows } = await db.query(
      `
      select distinct w.id
      from words w
      join word_topics wt
        on wt.word_id = w.id
      join topics t
        on t.id = wt.topic_id
      where t.slug = $1
      `,
      [topicSlug],
    );

    const ids = rows.map((row) => row.id as string);

    try {
      await redis.set(cacheKey, JSON.stringify(ids));
      // optional TTL:
      // await redis.expire(cacheKey, 60 * 60);
    } catch (error) {
      console.error(
        "[word-progress/weakestV2] topic scope Redis SET failed",
        error,
      );
    }

    return ids;
  }

  return [];
}

export default defineEventHandler(async (event) => {
  const auth = await requireUser(event);
  const userId = auth.sub;

  const query = getQuery(event);
  const levelSlug = typeof query.level === "string" ? query.level : undefined;
  const topicSlug = typeof query.topic === "string" ? query.topic : undefined;

  if ((!levelSlug && !topicSlug) || (levelSlug && topicSlug)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Provide either level or topic",
    });
  }

  const candidateWordIds = await loadCandidateWordIds(levelSlug, topicSlug);

  if (!candidateWordIds.length) {
    return [];
  }

  const redisKey = `word_progress:${userId}`;
  const weakest: Array<{ id: string; xp: number }> = [];

  let cachedById: Record<string, unknown> = {};

  try {
    const result = await redis.hmget(redisKey, ...candidateWordIds);

    if (Array.isArray(result)) {
      cachedById = Object.fromEntries(
        candidateWordIds.map((id, i) => [id, result[i] ?? null]),
      );
    } else {
      cachedById = (result ?? {}) as Record<string, unknown>;
    }

    try {
      await redis.expire(redisKey, WORD_PROGRESS_CACHE_TTL_SECONDS);
    } catch (error) {
      console.error(
        "[word-progress/weakestV2] Redis EXPIRE after HMGET failed",
        error,
      );
    }
  } catch (error) {
    console.error("[word-progress/weakestV2] Redis HMGET failed", error);
    cachedById = {};
  }

  const missingIds: string[] = [];

  for (const wordId of candidateWordIds) {
    const cached = parseCachedWordProgress(cachedById[wordId]);

    if (cached) {
      weakest.push({
        id: wordId,
        xp: cached.xp,
      });
    } else {
      missingIds.push(wordId);
    }
  }

  if (missingIds.length > 0) {
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

      weakest.push({
        id: row.word_id,
        xp: progress.xp,
      });

      redisWrites[row.word_id] = JSON.stringify(progress);
    }

    // Cache zero/default progress too
    for (const wordId of missingIds) {
      if (foundIds.has(wordId)) continue;

      const zeroProgress: WordProgress = {
        xp: 0,
        streak: 0,
      };

      weakest.push({
        id: wordId,
        xp: 0,
      });

      redisWrites[wordId] = JSON.stringify(zeroProgress);
    }

    try {
      if (Object.keys(redisWrites).length > 0) {
        await redis.hset(redisKey, redisWrites);

        try {
          await redis.expire(redisKey, WORD_PROGRESS_CACHE_TTL_SECONDS);
        } catch (error) {
          console.error(
            "[word-progress/weakestV2] Redis EXPIRE after HSET failed",
            error,
          );
        }
      }
    } catch (error) {
      console.error("[word-progress/weakestV2] Redis HSET failed", error);
    }
  }

  weakest.sort((a, b) => a.xp - b.xp);

  return weakest;
});
