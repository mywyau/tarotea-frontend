import { allowedLessonIds } from "~/server/services/lessons/access";
import { readLessonJson } from "~/server/services/lessons/storage";
import { loadSentenceWordCategories } from "~/server/services/sentence-quiz/start/loadSentenceWordCategories";
import { createError, getHeader, getQuery, getRequestIP } from "h3";
import { redis } from "~/server/repositories/redis";
import { loadSentenceProgressMap } from "~/server/services/sentence-quiz/start/loadSentenceProgressMap";
import { loadWordProgressMap } from "~/server/services/sentence-quiz/start/loadWordProgressMap";
import { pickBestVariantForWord } from "~/server/services/sentence-quiz/start/pickBestVariantForWord";
import type {
  LevelSentenceData,
  LevelSentenceItem,
  QuizSession,
  SentenceProgress,
} from "~/server/services/sentence-quiz/start/types";
import { enforceRateLimit } from "~/server/utils/rate-limiting/rateLimit";
import { getRateLimitSubject } from "~/server/utils/rate-limiting/subject";
import { requireUser } from "~/server/utils/requireUser";
import { buildSentenceQuiz, buildWordListeningQuiz, hasSpokenTarget } from "~/utils/quiz/buildSentenceQuiz";
import { isLevelId, levelIdToNumbers } from "~/utils/levels/levels";
import {
  isComingSoon,
} from "~/utils/levels/permissions";
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

  await enforceRateLimit(
    `rl:start:level-sentences:${rateLimitSubject}`,
    20,
    60,
  );

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


  const data = await readLessonJson<LevelSentenceData>("sentences", slug + "-sentences");

  const allItems = data.items ?? [];

  const wordListening = query.format === "word-listening";
  const categories = await loadSentenceWordCategories("levels", slug);
  const ids = allItems.map(item => item.sourceWordId);
  const allowed = await allowedLessonIds(ids, userId, `levels/${slug}`);
  const accessibleItems = allItems.filter(item =>
    allowed.has(item.sourceWordId) && (!wordListening || hasSpokenTarget(item))
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
    : new Map<string, SentenceProgress>();

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
