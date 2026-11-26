import { allowedLessonIds } from "~/server/services/lessons/access";
import { readLessonJson } from "~/server/services/lessons/storage";
import { loadSentenceWordCategories } from "~/server/services/sentence-quiz/start/loadSentenceWordCategories";
import { createError, getHeader, getQuery, getRequestIP } from "h3";
import { redis } from "~/server/repositories/redis";
import { loadSentenceProgressMap } from "~/server/services/topic/sentence-quiz/start/loadSentenceProgressMap";
import { loadWordProgressMap } from "~/server/services/topic/sentence-quiz/start/loadWordProgressMap";
import { pickBestVariantForWord } from "~/server/services/topic/sentence-quiz/start/pickBestVariantForWord";
import type {
  TopicSentenceData,
  TopicSentenceItem,
  QuizSession,
  SentenceProgress,
} from "~/server/services/topic/sentence-quiz/start/types";
import { enforceRateLimit } from "~/server/utils/rate-limiting/rateLimit";
import { getRateLimitSubject } from "~/server/utils/rate-limiting/subject";
import { requireUser } from "~/server/utils/requireUser";
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


  const data = await readLessonJson<TopicSentenceData>("topic-sentences", slug + "-sentences");

  const allItems = data.items ?? [];

  const wordListening = query.format === "word-listening";
  const categories = await loadSentenceWordCategories("topics", slug);
  const ids = allItems.map(item => item.sourceWordId);
  const allowed = await allowedLessonIds(ids, userId, `topics/${slug}`);
  const accessibleItems = allItems.filter(item =>
    allowed.has(item.sourceWordId) && (!wordListening || hasSpokenTarget(item))
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
