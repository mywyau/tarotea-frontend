import { createError, getRouterParam } from "h3";
import { SENTENCE_PROGRESS_CACHE_TTL_SECONDS } from "~/config/redis";
import { db } from "~/server/repositories/db";
import { redis } from "~/server/repositories/redis";
import { requireUser } from "~/server/utils/requireUser";
import { shuffleFisherYates } from "~/utils/shuffle";

type LevelSentenceItem = {
  sentenceId: string;
  sentence: string;
  jyutping: string;
  meaning: string;
  sourceWordId: string;
  sourceWord: string;
  sourceWordJyutping: string;
  sourceWordMeaning: string;
  tags: string[];
  sourceFile: string;
};

type LevelSentenceData = {
  level: string | number;
  title: string;
  totalWords: number;
  totalSentences: number;
  items: LevelSentenceItem[];
};

type SentenceProgress = {
  seenCount: number;
  lastSeenAt: string | Date | null;
};

type CachedSentenceProgress = {
  seenCount?: number;
  lastSeenAt?: string | null;
};

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

async function loadSentenceProgressMap(
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
        "[sentences/rotate] Redis EXPIRE after HMGET failed",
        error,
      );
    }
  } catch (error) {
    console.error("[sentences/rotate] Redis HMGET failed", error);
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

    // Only add actually-seen items to progressMap
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

  // Cache unseen items too so we stop re-querying Postgres
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
          "[sentences/rotate] Redis EXPIRE after HSET failed",
          error,
        );
      }
    }
  } catch (error) {
    console.error("[sentences/rotate] Redis HSET failed", error);
  }

  return progressMap;
}

function pickBestVariantForWord(
  variants: LevelSentenceItem[],
  progressMap: Map<string, SentenceProgress>,
): LevelSentenceItem {
  const randomized = shuffleFisherYates([...variants]);

  const unseen = randomized.filter(
    (variant) => !progressMap.has(variant.sentenceId),
  );

  if (unseen.length > 0) {
    return unseen[0];
  }

  const sortedSeen = randomized.sort((a, b) => {
    const aProgress = progressMap.get(a.sentenceId);
    const bProgress = progressMap.get(b.sentenceId);

    const aSeenCount = aProgress?.seenCount ?? 0;
    const bSeenCount = bProgress?.seenCount ?? 0;

    if (aSeenCount !== bSeenCount) {
      return aSeenCount - bSeenCount;
    }

    const aLastSeenMs = aProgress?.lastSeenAt
      ? new Date(aProgress.lastSeenAt).getTime()
      : 0;

    const bLastSeenMs = bProgress?.lastSeenAt
      ? new Date(bProgress.lastSeenAt).getTime()
      : 0;

    return aLastSeenMs - bLastSeenMs;
  });

  return sortedSeen[0];
}

export default defineEventHandler(async (event) => {
  const userId = await requireUser(event);
  const id = getRouterParam(event, "id");

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing id",
    });
  }

  const {
    public: { cdnBase },
  } = useRuntimeConfig();

  let data: LevelSentenceData;

  try {
    data = await $fetch<LevelSentenceData>(
      `${cdnBase}/sentences/${id}-sentences.json`,
    );
  } catch {
    throw createError({
      statusCode: 404,
      statusMessage: "sentence set not found",
    });
  }

  if (!data.items?.length) {
    return {
      ...data,
      totalSentences: 0,
      items: [],
    };
  }

  const sentenceIds = [...new Set(data.items.map((item) => item.sentenceId))];
  const progressMap = await loadSentenceProgressMap(userId, sentenceIds);

  const byWord = new Map<string, LevelSentenceItem[]>();

  for (const item of data.items) {
    const existing = byWord.get(item.sourceWordId) ?? [];
    existing.push(item);
    byWord.set(item.sourceWordId, existing);
  }

  const selected: LevelSentenceItem[] = [];

  for (const [, variants] of byWord) {
    if (!variants.length) continue;
    selected.push(pickBestVariantForWord(variants, progressMap));
  }

  return {
    ...data,
    totalSentences: selected.length,
    items: shuffleFisherYates(selected),
  };
});
