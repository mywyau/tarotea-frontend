import { loadSentenceWordCategories } from "~/server/services/sentence-quiz/start/loadSentenceWordCategories";
import { createError, getHeader, getQuery, getRequestIP } from "h3";
import { getUserEntitlement } from "#imports";
import { FREE_WORD_LIMIT } from "~/config/topic/topics-config";
import { redis } from "~/server/repositories/redis";
import { getUnlockedWordIdsForUser } from "~/server/services/cache/wordUnlockCache";
import { loadSentenceProgressMap } from "~/server/services/topic/sentence-quiz/start/loadSentenceProgressMap";
import { loadWordProgressMap } from "~/server/services/topic/sentence-quiz/start/loadWordProgressMap";
import { pickBestVariantForWord } from "~/server/services/topic/sentence-quiz/start/pickBestVariantForWord";
import {
  TopicSentenceData,
  TopicSentenceItem,
  QuizSession,
  SentenceProgress,
} from "~/server/services/topic/sentence-quiz/start/types";
import { enforceRateLimit } from "~/server/utils/rate-limiting/rateLimit";
import { getRateLimitSubject } from "~/server/utils/rate-limiting/subject";
import { requireUser } from "~/server/utils/requireUser";
import { Entitlement } from "~/types/auth/entitlements";
import { canAccessTopicWord, freeTopics } from "~/utils/topics/permissions";
import { buildSentenceQuiz, buildWordListeningQuiz, hasSpokenTarget } from "~/utils/quiz/buildSentenceQuiz";
import { shuffleFisherYates } from "~/utils/shuffle";

const QUIZ_SESSION_TTL_SECONDS = 60 * 30;

export default defineEventHandler(async (event) => {
  const bearerToken = getHeader(event, "authorization");
  const hasAuthHeader =
    typeof bearerToken === "string" && bearerToken.startsWith("Bearer ");
  const auth = hasAuthHeader ? await requireUser(event) : null;
  const userId = auth?.sub ?? null;
  const requestIp = getRequestIP(event, { xForwardedFor: true }) ?? "anon";
  const sessionOwner = userId ?? `guest:${requestIp}`;
  const rateLimitSubject = getRateLimitSubject(event, userId);
  const query = getQuery(event);

  await enforceRateLimit(
    `rl:start:topic-sentences:${rateLimitSubject}`,
    20,
    60,
  );

  const scope = String(query.scope ?? "topic");
  const slug = String(query.slug ?? "");

  if (!slug) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing slug",
    });
  }

  if (scope !== "topic") {
    throw createError({
      statusCode: 400,
      statusMessage: "Unsupported scope",
    });
  }

  const {
    public: { cdnBase },
  } = useRuntimeConfig();

  let data: TopicSentenceData;

  try {
    data = await $fetch<TopicSentenceData>(
      `${cdnBase}/topic-sentences/${slug}-sentences.json`,
    );
  } catch {
    throw createError({
      statusCode: 404,
      statusMessage: "sentence set not found",
    });
  }

  const allItems = data.items ?? [];

  // Build the ordered source-word pool for this sentence set.
  // If you want preview order to match the topic tiles exactly,
  // later extract this from the topic access helper instead.
  const sentenceSourceWordIdsInOrder = [
    ...new Set(allItems.map((item) => item.sourceWordId).filter(Boolean)),
  ];
  const wordListening = query.format === "word-listening";
  const categories = await loadSentenceWordCategories("topics", slug);
  const canonicalWordIdsInOrder = [...categories.keys()];
  const sourceWordIdsInOrder = canonicalWordIdsInOrder.length
    ? canonicalWordIdsInOrder
    : sentenceSourceWordIdsInOrder;

  let accessibleWordIdSet = new Set<string>(sourceWordIdsInOrder);

  if (!freeTopics.has(slug)) {
    if (!userId) {
      const freePreviewIds = sourceWordIdsInOrder.slice(0, FREE_WORD_LIMIT);
      accessibleWordIdSet = new Set(freePreviewIds);
    } else {
      const entitlement = (await getUserEntitlement(userId)) as Entitlement | null;
      const hasFullAccess = canAccessTopicWord(true, entitlement, slug);

      if (!hasFullAccess) {
      const freePreviewIds = sourceWordIdsInOrder.slice(0, FREE_WORD_LIMIT);
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
  }

  const sourceWordIdSet = new Set(sourceWordIdsInOrder);
  const accessibleItems = allItems.filter(
    (item) =>
      sourceWordIdSet.has(item.sourceWordId) &&
      accessibleWordIdSet.has(item.sourceWordId) &&
      (!wordListening || hasSpokenTarget(item)),
  );

  if (!accessibleItems.length) {
    const emptySessionKey = crypto.randomUUID();

    const session: QuizSession = {
      version: 1,
      mode: "topic-sentences",
      scope: "topic",
      slug,
      createdAt: new Date().toISOString(),
      allowedPairs: [],
    };

    await redis.set(
      `quiz:topic-sentences:${sessionOwner}:${emptySessionKey}`,
      JSON.stringify(session),
      { ex: QUIZ_SESSION_TTL_SECONDS },
    );

    return {
      sessionKey: emptySessionKey,
      quiz: {
        mode: "topic-sentences" as const,
        topic: String(data.topic),
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
    : new Map<string, SentenceProgress>();

  const byWord = new Map<string, TopicSentenceItem[]>();

  for (const item of accessibleItems) {
    const existing = byWord.get(item.sourceWordId) ?? [];
    existing.push(item);
    byWord.set(item.sourceWordId, existing);
  }

  const selected: TopicSentenceItem[] = [];

  for (const [, variants] of byWord) {
    if (!variants.length) continue;
    selected.push(pickBestVariantForWord(variants, sentenceProgressMap));
  }

  const shuffledItems = shuffleFisherYates(selected);
  const questions = (wordListening
    ? buildWordListeningQuiz(shuffledItems, categories)
    : buildSentenceQuiz(shuffledItems)
  ).slice(0, 20);
  const wordIds = [...new Set(questions.map((q) => q.wordId))];
  const progress = userId
    ? await loadWordProgressMap(userId, wordIds)
    : {};

  const sessionKey = crypto.randomUUID();

  const session: QuizSession = {
    version: 1,
    mode: "topic-sentences",
    scope: "topic",
    slug,
    createdAt: new Date().toISOString(),
    allowedPairs: questions.map((q) => ({
      wordId: q.wordId,
      sentenceId: q.sentenceId,
    })),
  };

  await redis.set(
    `quiz:topic-sentences:${sessionOwner}:${sessionKey}`,
    JSON.stringify(session),
    { ex: QUIZ_SESSION_TTL_SECONDS },
  );

  return {
    sessionKey,
    quiz: {
      mode: "topic-sentences" as const,
      topic: String(data.topic),
      title: data.title,
      totalQuestions: questions.length,
      questions,
    },
    progress,
  };
});
