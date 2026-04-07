import { createError, getQuery } from "h3";
import { redis } from "~/server/repositories/redis";
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
import { buildSentenceQuiz } from "~/utils/quiz/buildSentenceQuiz";
import { shuffleFisherYates } from "~/utils/shuffle";

const QUIZ_SESSION_TTL_SECONDS = 60 * 30;

export default defineEventHandler(async (event) => {
  const auth = await requireUser(event);
  const userId = auth.sub;

  await enforceRateLimit(`rl:start:level-sentences:${userId}`, 20, 60);

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

  if (!data.items?.length) {
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
      `quiz:sentences:${userId}:${emptySessionKey}`,
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

  const sentenceIds = [...new Set(data.items.map((item) => item.sentenceId))];
  const sentenceProgressMap = await loadSentenceProgressMap(
    userId,
    sentenceIds,
  );

  const byWord = new Map<string, LevelSentenceItem[]>();

  for (const item of data.items) {
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
  const progress = await loadWordProgressMap(userId, wordIds);

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
    `quiz:sentences:${userId}:${sessionKey}`,
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
