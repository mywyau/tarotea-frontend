import { getUserEntitlement } from "#imports";
import { createError, getHeader, getQuery, getRequestIP } from "h3";
import { FREE_LEVEL_WORD_LIMIT } from "~/config/level/levels-config";
import { redis } from "~/server/repositories/redis";
import { getUnlockedWordIdsForUser } from "~/server/services/cache/wordUnlockCache";
import { loadSentenceProgressMap } from "~/server/services/sentence-quiz/start/loadSentenceProgressMap";
import { loadWordProgressMap } from "~/server/services/sentence-quiz/start/loadWordProgressMap";
import { pickBestVariantForWord } from "~/server/services/sentence-quiz/start/pickBestVariantForWord";
import {
  LevelSentenceData,
  LevelSentenceItem,
  QuizSession,
} from "~/server/services/sentence-quiz/start/types";
import { enforceRateLimit } from "~/server/utils/rate-limiting/rateLimit";
import { requireUser } from "~/server/utils/requireUser";
import { Entitlement } from "~/types/auth/entitlements";
import { buildSentenceQuiz } from "~/utils/quiz/buildSentenceQuiz";
import { isLevelId, levelIdToNumbers } from "~/utils/levels/levels";
import {
  canAccessLevel,
  isComingSoon,
  isFreeLevel,
} from "~/utils/levels/permissions";
import { shuffleFisherYates } from "~/utils/shuffle";

const QUIZ_SESSION_TTL_SECONDS = 60 * 30;

type LevelIndexData = {
  categories?: Record<string, Array<{ id?: string }>>;
};

async function loadCanonicalLevelWordIds(slug: string): Promise<string[]> {
  try {
    const level = await $fetch<LevelIndexData>(`/api/index/levels/${slug}`);
    const ids = Object.values(level.categories ?? {})
      .flat()
      .map((word) => word.id ?? "")
      .filter(Boolean);

    return [...new Set(ids)];
  } catch {
    return [];
  }
}

export default defineEventHandler(async (event) => {
  const bearerToken = getHeader(event, "authorization");
  const hasAuthHeader =
    typeof bearerToken === "string" && bearerToken.startsWith("Bearer ");
  const auth = hasAuthHeader ? await requireUser(event) : null;
  const userId = auth?.sub ?? null;
  const requestIp = getRequestIP(event, { xForwardedFor: true }) ?? "anon";
  const sessionOwner = userId ?? `guest:${requestIp}`;

  await enforceRateLimit(`rl:start:level-sentences:${sessionOwner}`, 20, 60);

  const query = getQuery(event);

  const scope = String(query.scope ?? "level");
  const slug = String(query.slug ?? "");

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

  const {
    public: { cdnBase },
  } = useRuntimeConfig();

  let data: LevelSentenceData;

  try {
    data = await $fetch<LevelSentenceData>(
      `${cdnBase}/sentences/${slug}-sentences.json`,
    );
  } catch {
    throw createError({
      statusCode: 404,
      statusMessage: "sentence set not found",
    });
  }

  const allItems = data.items ?? [];

  const sentenceSourceWordIdsInOrder = [
    ...new Set(allItems.map((item) => item.sourceWordId).filter(Boolean)),
  ];
  const canonicalWordIdsInOrder = await loadCanonicalLevelWordIds(slug);
  const sourceWordIdsInOrder = canonicalWordIdsInOrder.length
    ? canonicalWordIdsInOrder
    : sentenceSourceWordIdsInOrder;

  let accessibleWordIdSet = new Set<string>(sourceWordIdsInOrder);

  if (!userId) {
    const freePreviewIds = sourceWordIdsInOrder.slice(0, FREE_LEVEL_WORD_LIMIT);
    accessibleWordIdSet = new Set(freePreviewIds);
  } else if (!isFreeLevel(levelNumber)) {
    const entitlement = (await getUserEntitlement(userId)) as Entitlement | null;
    const hasFullAccess = canAccessLevel(true, entitlement, levelNumber);

    if (!hasFullAccess) {
      const freePreviewIds = sourceWordIdsInOrder.slice(0, FREE_LEVEL_WORD_LIMIT);
      const unlockedWordIds = await getUnlockedWordIdsForUser(
        userId,
        sourceWordIdsInOrder,
      );

      accessibleWordIdSet = new Set([
        ...freePreviewIds,
        ...unlockedWordIds,
      ]);
    }
  }

  const sourceWordIdSet = new Set(sourceWordIdsInOrder);
  const accessibleItems = allItems.filter(
    (item) =>
      sourceWordIdSet.has(item.sourceWordId) &&
      accessibleWordIdSet.has(item.sourceWordId),
  );

  if (!accessibleItems.length) {
    const emptySessionKey = crypto.randomUUID();

    const session: QuizSession = {
      version: 1,
      mode: "level-sentences",
      scope: "level",
      slug,
      createdAt: new Date().toISOString(),
      allowedPairs: [],
    };

    await redis.set(
      `quiz:sentences:${sessionOwner}:${emptySessionKey}`,
      JSON.stringify(session),
      { ex: QUIZ_SESSION_TTL_SECONDS },
    );

    return {
      sessionKey: emptySessionKey,
      quiz: {
        mode: "level-sentences" as const,
        level: String(data.level),
        title: data.title,
        totalQuestions: 0,
        questions: [],
      },
      progress: {},
    };
  }

  const sentenceIds = [
    ...new Set(accessibleItems.map((item) => item.sentenceId)),
  ];
  const sentenceProgressMap = userId
    ? await loadSentenceProgressMap(userId, sentenceIds)
    : new Map<string, number>();

  const byWord = new Map<string, LevelSentenceItem[]>();

  for (const item of accessibleItems) {
    const existing = byWord.get(item.sourceWordId) ?? [];
    existing.push(item);
    byWord.set(item.sourceWordId, existing);
  }

  const selected: LevelSentenceItem[] = [];

  for (const [, variants] of byWord) {
    if (!variants.length) continue;
    selected.push(pickBestVariantForWord(variants, sentenceProgressMap));
  }

  const shuffledItems = shuffleFisherYates(selected);
  const questions = buildSentenceQuiz(shuffledItems).slice(0, 20);
  const wordIds = [...new Set(questions.map((q) => q.wordId))];
  const progress = userId
    ? await loadWordProgressMap(userId, wordIds)
    : {};

  const sessionKey = crypto.randomUUID();

  const session: QuizSession = {
    version: 1,
    mode: "level-sentences",
    scope: "level",
    slug,
    createdAt: new Date().toISOString(),
    allowedPairs: questions.map((q) => ({
      wordId: q.wordId,
      sentenceId: q.sentenceId,
    })),
  };

  await redis.set(
    `quiz:sentences:${sessionOwner}:${sessionKey}`,
    JSON.stringify(session),
    { ex: QUIZ_SESSION_TTL_SECONDS },
  );

  return {
    sessionKey,
    quiz: {
      mode: "level-sentences" as const,
      level: String(data.level),
      title: data.title,
      totalQuestions: questions.length,
      questions,
    },
    progress,
  };
});
