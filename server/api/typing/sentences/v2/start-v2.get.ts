import { getUserEntitlement } from "#imports";
import { createError, getHeader, getQuery, getRequestIP } from "h3";
import { FREE_LEVEL_WORD_LIMIT } from "~/config/level/levels-config";
import { FREE_WORD_LIMIT } from "~/config/topic/topics-config";
import { db } from "~/server/repositories/db";
import { redis } from "~/server/repositories/redis";
import { getUnlockedWordIdsForUser } from "~/server/services/cache/wordUnlockCache";
import { requireUser } from "~/server/utils/requireUser";
import { Entitlement } from "~/types/auth/entitlements";
import {
  isLevelId,
  levelIdToNumbers,
  levelTitles,
} from "~/utils/levels/levels";
import {
  canAccessLevel,
  isComingSoon,
  isFreeLevel,
} from "~/utils/levels/permissions";
import { shuffleFisherYates } from "~/utils/shuffle";
import { canAccessTopicWord, freeTopics } from "~/utils/topics/permissions";
import { topics } from "~/utils/topics/topics";
import {
  totalSentenceQuestions,
  weakestWordRatio
} from "~/utils/weakestWords";

const QUIZ_SESSION_TTL_SECONDS = 60 * 30;
const SENTENCE_CONTENT_CACHE_TTL_SECONDS = 60 * 10;
const LOCAL_SENTENCE_CONTENT_CACHE_TTL_MS = 60 * 1000;

type Scope = "level" | "topic";
type Variant = "chinese";
type DojoMode = "dojo-level-sentences-chinese" | "dojo-topic-sentences-chinese";

type TrainSentence = {
  sentenceId: string;
  sentence: string;
  jyutping: string;
  meaning: string;
  sourceWordId: string;
  sourceWord: string;
};

type SentenceSetResponse = {
  title?: string;
  items: TrainSentence[];
};

type QuizSession = {
  version: 1;
  mode: DojoMode;
  scope: Scope;
  slug: string;
  createdAt: string;
  allowedSentences: Array<{
    sentenceId: string;
    sourceWordId: string;
  }>;
};

type CachedSentenceContent = {
  items: TrainSentence[];
  sourceWordIds: string[];
};

type LocalCacheEntry<T> = {
  expiresAt: number;
  value: T;
};

const localSentenceContentCache = new Map<
  string,
  LocalCacheEntry<CachedSentenceContent>
>();

const inflightSentenceContent = new Map<
  string,
  Promise<CachedSentenceContent>
>();

function getSessionRedisKey(userId: string, sessionKey: string) {
  return `dojo:sentence:${userId}:${sessionKey}`;
}

function getContentCacheKey(scope: Scope, slug: string) {
  return `dojo:sentence:content:${scope}:${slug}`;
}

function getInflightKey(scope: Scope, slug: string) {
  return `${scope}:${slug}`;
}

function resolveScope(rawScope: string): Scope {
  if (rawScope === "level" || rawScope === "topic") return rawScope;

  throw createError({
    statusCode: 400,
    statusMessage: "Unsupported scope",
  });
}

function resolveVariant(rawVariant: string): Variant {
  if (rawVariant === "chinese") return rawVariant;

  throw createError({
    statusCode: 400,
    statusMessage: "Unsupported variant",
  });
}

function resolveMode(scope: Scope, variant: Variant): DojoMode {
  if (scope === "level" && variant === "chinese") {
    return "dojo-level-sentences-chinese";
  }

  return "dojo-topic-sentences-chinese";
}

function resolveTitle(scope: Scope, slug: string) {
  if (scope === "level") {
    return `Sentence Dojo - ${levelTitles[slug] ?? slug}`;
  }

  const topicTitle = topics.find((topic) => topic.id === slug)?.title ?? slug;
  return `Sentence Dojo - ${topicTitle}`;
}

function pickWeightedSentences(
  all: TrainSentence[],
  weakestIds: string[],
  limit: number,
  weakestRatio: number,
) {
  const weakestSet = new Set(weakestIds)

  // First: keep only one sentence per target/source word.
  // Shuffle first so the chosen sentence variant is not always the first one.
  const uniqueBySourceWord: TrainSentence[] = []
  const seenSourceWordIds = new Set<string>()

  for (const sentence of shuffleFisherYates(all)) {
    if (!sentence.sourceWordId) continue
    if (seenSourceWordIds.has(sentence.sourceWordId)) continue

    seenSourceWordIds.add(sentence.sourceWordId)
    uniqueBySourceWord.push(sentence)
  }

  const weak: TrainSentence[] = []
  const normal: TrainSentence[] = []

  for (const sentence of uniqueBySourceWord) {
    if (weakestSet.has(sentence.sourceWordId)) {
      weak.push(sentence)
    } else {
      normal.push(sentence)
    }
  }

  const safeLimit = Math.min(limit, uniqueBySourceWord.length)
  const weakTarget = Math.min(
    Math.round(safeLimit * weakestRatio),
    weak.length,
  )

  const shuffledWeak = shuffleFisherYates(weak)
  const shuffledNormal = shuffleFisherYates(normal)

  const selected = [
    ...shuffledWeak.slice(0, weakTarget),
    ...shuffledNormal.slice(0, safeLimit - weakTarget),
  ]

  if (selected.length < safeLimit) {
    const usedSourceWordIds = new Set(selected.map((s) => s.sourceWordId))

    for (const sentence of [...shuffledWeak, ...shuffledNormal]) {
      if (selected.length >= safeLimit) break
      if (usedSourceWordIds.has(sentence.sourceWordId)) continue

      usedSourceWordIds.add(sentence.sourceWordId)
      selected.push(sentence)
    }
  }

  return shuffleFisherYates(selected)
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
  console.info("[dojo-sentence-start]", JSON.stringify(details));
}

function getLocalSentenceContent(
  scope: Scope,
  slug: string,
): CachedSentenceContent | null {
  const key = getInflightKey(scope, slug);
  const entry = localSentenceContentCache.get(key);

  if (!entry) return null;

  if (entry.expiresAt <= Date.now()) {
    localSentenceContentCache.delete(key);
    return null;
  }

  return entry.value;
}

function setLocalSentenceContent(
  scope: Scope,
  slug: string,
  value: CachedSentenceContent,
) {
  const key = getInflightKey(scope, slug);
  localSentenceContentCache.set(key, {
    value,
    expiresAt: Date.now() + LOCAL_SENTENCE_CONTENT_CACHE_TTL_MS,
  });
}

async function loadSentenceSet(
  scope: Scope,
  slug: string,
): Promise<SentenceSetResponse> {
  const {
    public: { cdnBase },
  } = useRuntimeConfig();

  try {
    if (scope === "level") {
      return await $fetch<SentenceSetResponse>(
        `${cdnBase}/sentences/${slug}-sentences.json`,
      );
    }

    return await $fetch<SentenceSetResponse>(
      `${cdnBase}/topic-sentences/${slug}-sentences.json`,
    );
  } catch {
    throw createError({
      statusCode: 404,
      statusMessage: "Sentence set not found",
    });
  }
}

async function buildAndCacheSentenceContent(
  scope: Scope,
  slug: string,
  timings: Record<string, number>,
): Promise<CachedSentenceContent> {
  const cacheKey = getContentCacheKey(scope, slug);

  const sentenceSet = await timedStep(timings, "cdnFetchMs", async () => {
    return loadSentenceSet(scope, slug);
  });

  const content = await timedStep(timings, "contentBuildMs", async () => {
    const items = Array.isArray(sentenceSet.items) ? sentenceSet.items : [];
    const sourceWordIds = [
      ...new Set(items.map((s) => s.sourceWordId).filter(Boolean)),
    ];
    return { items, sourceWordIds };
  });

  setLocalSentenceContent(scope, slug, content);

  await timedStep(timings, "contentCacheWriteMs", async () => {
    await redis.set(cacheKey, JSON.stringify(content), {
      ex: SENTENCE_CONTENT_CACHE_TTL_SECONDS,
    });
  });

  return content;
}

async function getCachedSentenceContent(
  scope: Scope,
  slug: string,
  timings: Record<string, number>,
): Promise<CachedSentenceContent> {
  const local = getLocalSentenceContent(scope, slug);
  if (local) {
    timings.contentSource = 0;
    timings.localCacheHit = 1;
    return local;
  }

  const cacheKey = getContentCacheKey(scope, slug);

  const cached = await timedStep(timings, "contentCacheReadMs", async () => {
    return redis.get(cacheKey);
  });

  if (cached) {
    try {
      const parsed = JSON.parse(cached) as CachedSentenceContent;

      if (
        parsed &&
        Array.isArray(parsed.items) &&
        Array.isArray(parsed.sourceWordIds)
      ) {
        setLocalSentenceContent(scope, slug, parsed);
        timings.contentSource = 1;
        timings.localCacheHit = 0;
        return parsed;
      }
    } catch {
      // ignore bad cache and rebuild
    }
  }

  const inflightKey = getInflightKey(scope, slug);
  const existingInflight = inflightSentenceContent.get(inflightKey);

  if (existingInflight) {
    timings.contentSource = 2;
    timings.localCacheHit = 0;
    return timedStep(timings, "inflightWaitMs", async () => existingInflight);
  }

  const promise = buildAndCacheSentenceContent(scope, slug, timings).finally(
    () => {
      inflightSentenceContent.delete(inflightKey);
    },
  );

  inflightSentenceContent.set(inflightKey, promise);

  timings.contentSource = 3;
  timings.localCacheHit = 0;
  return promise;
}

export default defineEventHandler(async (event) => {
  const requestStart = nowMs();
  const timings: Record<string, number> = {};

  const bearerToken = getHeader(event, "authorization");
  const hasAuthHeader =
    typeof bearerToken === "string" && bearerToken.startsWith("Bearer ");
  const auth = hasAuthHeader
    ? await timedStep(timings, "authMs", async () => requireUser(event))
    : null;
  const userId = auth?.sub ?? null;
  const requestIp = getRequestIP(event, { xForwardedFor: true }) ?? "anon";
  const sessionOwner = userId ?? `guest:${requestIp}`;

  const query = getQuery(event);
  const scope = resolveScope(String(query.scope ?? "level"));
  const slug = String(query.slug ?? "");
  const variant = resolveVariant(String(query.variant ?? "chinese"));
  const mode = resolveMode(scope, variant);

  if (!slug) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing slug",
    });
  }

  const { items: allSentences, sourceWordIds: allWordIds } = await timedStep(
    timings,
    "loadContentMs",
    async () => getCachedSentenceContent(scope, slug, timings),
  );

  let accessibleSentences = allSentences;
  let accessibleWordIds = allWordIds;

  if (scope === "level") {
    if (!isLevelId(slug)) {
      throw createError({
        statusCode: 404,
        statusMessage: "Level not found",
      });
    }

    const levelNumber = levelIdToNumbers(slug);

    if (isComingSoon(levelNumber)) {
      throw createError({
        statusCode: 403,
        statusMessage: "Level coming soon",
      });
    }

    if (!userId) {
      const freePreviewIds = allWordIds.slice(0, FREE_LEVEL_WORD_LIMIT);
      const previewSet = new Set(freePreviewIds);
      accessibleSentences = allSentences.filter((sentence) =>
        previewSet.has(sentence.sourceWordId),
      );
      accessibleWordIds = allWordIds.filter((id) => previewSet.has(id));
    } else if (!isFreeLevel(levelNumber)) {
      const entitlement = (await getUserEntitlement(
        userId,
      )) as Entitlement | null;
      const hasFullAccess = canAccessLevel(true, entitlement, levelNumber);

      if (!hasFullAccess) {
        const freePreviewIds = allWordIds.slice(0, FREE_LEVEL_WORD_LIMIT);
        const unlockedWordIds = await timedStep(
          timings,
          "unlockLookupMs",
          async () => getUnlockedWordIdsForUser(userId, allWordIds),
        );

        const accessibleWordIdSet = new Set([
          ...freePreviewIds,
          ...unlockedWordIds,
        ]);

        accessibleSentences = allSentences.filter((sentence) =>
          accessibleWordIdSet.has(sentence.sourceWordId),
        );
        accessibleWordIds = allWordIds.filter((id) =>
          accessibleWordIdSet.has(id),
        );
      }
    }
  } else {
    if (!freeTopics.has(slug)) {
      if (!userId) {
        const freePreviewIds = allWordIds.slice(0, FREE_WORD_LIMIT);
        const previewSet = new Set(freePreviewIds);
        accessibleSentences = allSentences.filter((sentence) =>
          previewSet.has(sentence.sourceWordId),
        );
        accessibleWordIds = allWordIds.filter((id) => previewSet.has(id));
      } else {
      const entitlement = (await getUserEntitlement(
        userId,
      )) as Entitlement | null;
      const hasFullAccess = canAccessTopicWord(true, entitlement, slug);

      if (!hasFullAccess) {
        const freePreviewIds = allWordIds.slice(0, FREE_WORD_LIMIT);
        const unlockedWordIds = await timedStep(
          timings,
          "unlockLookupMs",
          async () => getUnlockedWordIdsForUser(userId, allWordIds),
        );

        const accessibleWordIdSet = new Set([
          ...freePreviewIds,
          ...unlockedWordIds,
        ]);

        accessibleSentences = allSentences.filter((sentence) =>
          accessibleWordIdSet.has(sentence.sourceWordId),
        );
        accessibleWordIds = allWordIds.filter((id) =>
          accessibleWordIdSet.has(id),
        );
      }
      }
    }
  }

  if (!accessibleSentences.length) {
    const sessionKey = crypto.randomUUID();

    const session: QuizSession = {
      version: 1,
      mode,
      scope,
      slug,
      createdAt: new Date().toISOString(),
      allowedSentences: [],
    };

    await timedStep(timings, "sessionWriteMs", async () => {
      await redis.set(
        getSessionRedisKey(sessionOwner, sessionKey),
        JSON.stringify(session),
        { ex: QUIZ_SESSION_TTL_SECONDS },
      );
    });

    const totalMs = Math.round(nowMs() - requestStart);

    if (totalMs > 1000) {
      console.warn(
        "[dojo-sentence-start-slow]",
        JSON.stringify({
          scope,
          slug,
          variant,
          totalSentencesAvailable: allSentences.length,
          accessibleSentences: 0,
          selectedSentences: 0,
          ...timings,
          totalMs,
        }),
      );
    } else {
      logSummary({
        scope,
        slug,
        variant,
        totalSentencesAvailable: allSentences.length,
        accessibleSentences: 0,
        selectedSentences: 0,
        ...timings,
        totalMs,
      });
    }

    return {
      sessionKey,
      session: {
        mode,
        [scope]: slug,
        title: resolveTitle(scope, slug),
        totalSentences: 0,
        sentences: [],
      },
      progress: {},
    };
  }

  const xpMap = await timedStep(timings, "xpMapBuildMs", async () => {
    if (!userId) {
      return new Map<string, number>();
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
        [userId, accessibleWordIds],
      );
    });

    return new Map<string, number>(
      progressRes.rows.map((row) => [row.word_id, Number(row.xp ?? 0)]),
    );
  });

  const weakestIds = await timedStep(timings, "weakestSortMs", async () => {
    return [...accessibleWordIds].sort(
      (a, b) => (xpMap.get(a) ?? 0) - (xpMap.get(b) ?? 0),
    );
  });

  const selected = await timedStep(timings, "selectionMs", async () => {
    return pickWeightedSentences(
      accessibleSentences,
      weakestIds,
      totalSentenceQuestions,
      weakestWordRatio,
    );
  });

  const progress = await timedStep(timings, "responseShapeMs", async () => {
    const shaped: Record<string, { xp: number }> = {};

    for (const sentence of selected) {
      shaped[sentence.sourceWordId] = {
        xp: xpMap.get(sentence.sourceWordId) ?? 0,
      };
    }

    return shaped;
  });

  const sessionKey = crypto.randomUUID();

  const session: QuizSession = {
    version: 1,
    mode,
    scope,
    slug,
    createdAt: new Date().toISOString(),
    allowedSentences: selected.map((s) => ({
      sentenceId: s.sentenceId,
      sourceWordId: s.sourceWordId,
    })),
  };

  await timedStep(timings, "sessionWriteMs", async () => {
    await redis.set(
      getSessionRedisKey(sessionOwner, sessionKey),
      JSON.stringify(session),
      { ex: QUIZ_SESSION_TTL_SECONDS },
    );
  });

  const response = {
    sessionKey,
    session: {
      mode,
      [scope]: slug,
      title: resolveTitle(scope, slug),
      totalSentences: selected.length,
      sentences: selected.map((s) => ({
        sentenceId: s.sentenceId,
        sentence: s.sentence,
        jyutping: s.jyutping,
        meaning: s.meaning,
        sourceWordId: s.sourceWordId,
        sourceWord: s.sourceWord,
      })),
    },
    progress,
  };

  const totalMs = Math.round(nowMs() - requestStart);
  const logPayload = {
    scope,
    slug,
    variant,
    cacheHit: timings.contentSource === 0 || timings.contentSource === 1,
    contentSource:
      timings.contentSource === 0
        ? "local"
        : timings.contentSource === 1
          ? "redis"
          : timings.contentSource === 2
            ? "inflight"
            : "rebuilt",
    totalSentencesAvailable: allSentences.length,
    uniqueSourceWordIds: allWordIds.length,
    accessibleSentences: accessibleSentences.length,
    accessibleSourceWordIds: accessibleWordIds.length,
    selectedSentences: selected.length,
    ...timings,
    totalMs,
  };

  if (totalMs > 1000) {
    console.warn("[dojo-sentence-start-slow]", JSON.stringify(logPayload));
  } else {
    logSummary(logPayload);
  }

  return response;
});
