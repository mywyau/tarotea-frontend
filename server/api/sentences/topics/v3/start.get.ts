import { createError, getQuery } from "h3";
import { redis } from "~/server/repositories/redis";
import { loadSentenceProgressMap } from "~/server/services/topic/sentence-quiz/start/loadSentenceProgressMap";
import { loadWordProgressMap } from "~/server/services/topic/sentence-quiz/start/loadWordProgressMap";
import { pickBestVariantForWord } from "~/server/services/topic/sentence-quiz/start/pickBestVariantForWord";
import {
  TopicSentenceData,
  TopicSentenceItem,
  QuizSession,
} from "~/server/services/topic/sentence-quiz/start/types";
import { enforceRateLimit } from "~/server/utils/rate-limiting/rateLimit";
import { requireUser } from "~/server/utils/requireUser";
import { buildSentenceQuiz } from "~/utils/quiz/buildSentenceQuiz";
import { shuffleFisherYates } from "~/utils/shuffle";

const QUIZ_SESSION_TTL_SECONDS = 60 * 30;

export default defineEventHandler(async (event) => {
  const auth = await requireUser(event);
  const userId = auth.sub;
  const query = getQuery(event);

  await enforceRateLimit(`rl:start:topic-sentences:${userId}`, 20, 60);

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

  if (!data.items?.length) {
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
      `quiz:sentences:${userId}:${emptySessionKey}`,
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

  const sentenceIds = [...new Set(data.items.map((item) => item.sentenceId))];
  const sentenceProgressMap = await loadSentenceProgressMap(
    userId,
    sentenceIds,
  );

  const byWord = new Map<string, TopicSentenceItem[]>();

  for (const item of data.items) {
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
  const questions = buildSentenceQuiz(shuffledItems).slice(0, 20);
  const wordIds = [...new Set(questions.map((q) => q.wordId))];
  const progress = await loadWordProgressMap(userId, wordIds);

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
    `quiz:topic-sentences:${userId}:${sessionKey}`,
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
