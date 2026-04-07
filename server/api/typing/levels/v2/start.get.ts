import { createError, getQuery } from "h3";
import { db } from "~/server/repositories/db";
import { redis } from "~/server/repositories/redis";
import { enforceRateLimit } from "~/server/utils/rate-limiting/rateLimit";
import { requireUser } from "~/server/utils/requireUser";
import { levelTitles } from "~/utils/levels/levels";
import { generateWeightedWords } from "~/utils/quiz/generateWeightedWords";
import { totalQuestions, weakestWordRatio } from "~/utils/weakestWords";

const QUIZ_SESSION_TTL_SECONDS = 60 * 30;
const LEVEL_CONTENT_CACHE_TTL_SECONDS = 60 * 10;

type VocabWord = {
  id: string;
  word: string;
  jyutping: string;
  meaning: string;
};

type LevelData = {
  categories: Record<string, VocabWord[]>;
};

type DojoVariant = "jyutping" | "chinese";
type DojoMode = "dojo-level-jyutping" | "dojo-level-chinese";

type QuizSession = {
  version: 1;
  mode: DojoMode;
  scope: "level";
  slug: string;
  createdAt: string;
  allowedWordIds: string[];
};

type CachedLevelContent = {
  words: VocabWord[];
  wordIds: string[];
};

function resolveVariant(rawVariant: string): DojoVariant {
  if (rawVariant === "jyutping" || rawVariant === "chinese") {
    return rawVariant;
  }

  throw createError({
    statusCode: 400,
    statusMessage: "Unsupported variant",
  });
}

function resolveMode(variant: DojoVariant): DojoMode {
  switch (variant) {
    case "jyutping":
      return "dojo-level-jyutping";
    case "chinese":
      return "dojo-level-chinese";
  }
}

function resolveTitle(variant: DojoVariant, slug: string) {
  const levelTitle = levelTitles[slug] ?? slug;

  switch (variant) {
    case "jyutping":
      return `Jyutping Dojo - ${levelTitle}`;
    case "chinese":
      return `Chinese Dojo - ${levelTitle}`;
  }
}

function nowMs() {
  return performance.now();
}

async function timedStep<T>(
  timings: Record<string, number>,
  label: string,
  fn: () => Promise<T>,
): Promise<T> {
  const start = nowMs();
  try {
    return await fn();
  } finally {
    timings[label] = Math.round(nowMs() - start);
  }
}

function logSummary(details: Record<string, unknown>) {
  console.info("[dojo-level-start]", JSON.stringify(details));
}

function getLevelContentCacheKey(slug: string) {
  return `dojo:typing:level:content:${slug}`;
}

function getSessionCacheKey(userId: string, sessionKey: string) {
  return `dojo:typing:level:${userId}:${sessionKey}`;
}

async function getCachedLevelContent(
  slug: string,
  cdnBase: string,
  timings: Record<string, number>,
): Promise<CachedLevelContent> {
  const cacheKey = getLevelContentCacheKey(slug);

  const cached = await timedStep(timings, "contentCacheReadMs", async () => {
    return redis.get(cacheKey);
  });

  if (cached) {
    try {
      const parsed = JSON.parse(cached) as CachedLevelContent;

      if (
        parsed &&
        Array.isArray(parsed.words) &&
        Array.isArray(parsed.wordIds)
      ) {
        timings.contentSource = 0;
        return parsed;
      }
    } catch {
      // ignore bad cache and rebuild
    }
  }

  const levelData = await timedStep(timings, "cdnFetchMs", async () => {
    try {
      return await $fetch<LevelData>(`${cdnBase}/vocab-quiz/${slug}.json`);
    } catch {
      throw createError({
        statusCode: 404,
        statusMessage: "Vocab quiz set not found",
      });
    }
  });

  const content = await timedStep(timings, "contentBuildMs", async () => {
    const words = Object.values(levelData.categories ?? {}).flat();
    const wordIds = [...new Set(words.map((w) => w.id))];

    return { words, wordIds };
  });

  await timedStep(timings, "contentCacheWriteMs", async () => {
    await redis.set(cacheKey, JSON.stringify(content), {
      ex: LEVEL_CONTENT_CACHE_TTL_SECONDS,
    });
  });

  timings.contentSource = 1;
  return content;
}

export default defineEventHandler(async (event) => {
  const requestStart = nowMs();
  const timings: Record<string, number> = {};

  const auth = await timedStep(timings, "authMs", async () => {
    return requireUser(event);
  });

  const userId = auth.sub;

  await enforceRateLimit(`rl:start:typing-level-sentences:${userId}`, 20, 60);

  const query = getQuery(event);
  const scope = String(query.scope ?? "level");
  const slug = String(query.slug ?? "");
  const variant = resolveVariant(String(query.variant ?? "jyutping"));
  const mode = resolveMode(variant);

  if (!slug) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing slug",
    });
  }

  if (scope !== "level") {
    throw createError({
      statusCode: 400,
      statusMessage: "Unsupported scope",
    });
  }

  const {
    public: { cdnBase },
  } = useRuntimeConfig();

  const { words: allWords, wordIds: allWordIds } = await timedStep(
    timings,
    "loadContentMs",
    async () => getCachedLevelContent(slug, cdnBase, timings),
  );

  if (!allWords.length) {
    const sessionKey = crypto.randomUUID();

    const session: QuizSession = {
      version: 1,
      mode,
      scope: "level",
      slug,
      createdAt: new Date().toISOString(),
      allowedWordIds: [],
    };

    await timedStep(timings, "sessionWriteMs", async () => {
      await redis.set(
        getSessionCacheKey(userId, sessionKey),
        JSON.stringify(session),
        { ex: QUIZ_SESSION_TTL_SECONDS },
      );
    });

    logSummary({
      slug,
      variant,
      scope,
      userId,
      totalWordsInLevel: 0,
      selectedWords: 0,
      ...timings,
      totalMs: Math.round(nowMs() - requestStart),
    });

    return {
      sessionKey,
      session: {
        mode,
        level: slug,
        title: resolveTitle(variant, slug),
        totalWords: 0,
        words: [],
      },
      progress: {},
    };
  }

  const progressRes = await timedStep(timings, "progressQueryMs", async () => {
    return db.query<{
      word_id: string;
      xp: number | string | null;
    }>(
      `
      select word_id, xp
      from user_word_progress
      where user_id = $1
        and word_id = any($2::text[])
      `,
      [userId, allWordIds],
    );
  });

  const xpMap = await timedStep(timings, "xpMapBuildMs", async () => {
    return new Map<string, number>(
      progressRes.rows.map((row) => [row.word_id, Number(row.xp ?? 0)]),
    );
  });

  const weakestIds = await timedStep(timings, "weakestSortMs", async () => {
    return allWordIds
      .map((id) => ({
        id,
        xp: xpMap.get(id) ?? 0,
      }))
      .sort((a, b) => a.xp - b.xp)
      .map((w) => w.id);
  });

  const selected = await timedStep(timings, "selectionMs", async () => {
    return generateWeightedWords(allWords, weakestIds, {
      totalQuestions,
      weakestRatio: weakestWordRatio,
    });
  });

  const progress = await timedStep(timings, "responseShapeMs", async () => {
    const shaped: Record<string, { xp: number }> = {};

    for (const word of selected) {
      shaped[word.id] = {
        xp: xpMap.get(word.id) ?? 0,
      };
    }

    return shaped;
  });

  const sessionKey = crypto.randomUUID();

  const session: QuizSession = {
    version: 1,
    mode,
    scope: "level",
    slug,
    createdAt: new Date().toISOString(),
    allowedWordIds: selected.map((w) => w.id),
  };

  await timedStep(timings, "sessionWriteMs", async () => {
    await redis.set(
      getSessionCacheKey(userId, sessionKey),
      JSON.stringify(session),
      { ex: QUIZ_SESSION_TTL_SECONDS },
    );
  });

  const response = {
    sessionKey,
    session: {
      mode,
      level: slug,
      title: resolveTitle(variant, slug),
      totalWords: selected.length,
      words: selected.map((w) => ({
        wordId: w.id,
        word: w.word,
        jyutping: w.jyutping,
        meaning: w.meaning,
      })),
    },
    progress,
  };

  logSummary({
    slug,
    variant,
    scope,
    userId,
    totalWordsInLevel: allWords.length,
    uniqueWordIds: allWordIds.length,
    selectedWords: selected.length,
    cacheHit: timings.contentSource === 0,
    ...timings,
    totalMs: Math.round(nowMs() - requestStart),
  });

  return response;
});