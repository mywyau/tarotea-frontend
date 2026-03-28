import { createError, getQuery } from "h3";
import { db } from "~/server/repositories/db";
import { redis } from "~/server/repositories/redis";
import { requireUser } from "~/server/utils/requireUser";
import { levelTitles } from "~/utils/levels/levels";
import { topics } from "~/utils/topics/topics";
import { totalQuestions, weakestWordRatio } from "~/utils/weakestWords";

const QUIZ_SESSION_TTL_SECONDS = 60 * 30;

type Scope = "level" | "topic";
type Variant = "chinese";
type DojoMode =
  | "dojo-level-sentences-chinese"
  | "dojo-topic-sentences-chinese";

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

function getSessionRedisKey(userId: string, sessionKey: string) {
  return `dojo:sentence:${userId}:${sessionKey}`;
}

function resolveScope(rawScope: string): Scope {
  if (rawScope === "level" || rawScope === "topic") {
    return rawScope;
  }

  throw createError({
    statusCode: 400,
    statusMessage: "Unsupported scope",
  });
}

function resolveVariant(rawVariant: string): Variant {
  if (rawVariant === "chinese") {
    return rawVariant;
  }

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

function shuffleArray<T>(items: T[]) {
  const arr = [...items];

  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  return arr;
}

function pickWeightedSentences(
  all: TrainSentence[],
  weakestIds: string[],
  limit: number,
  weakestRatio: number,
) {
  const uniqueAll = all.filter(
    (item, index, arr) =>
      arr.findIndex((x) => x.sentenceId === item.sentenceId) === index,
  );

  const weakestSet = new Set(weakestIds);

  const weak = uniqueAll.filter((s) => weakestSet.has(s.sourceWordId));
  const normal = uniqueAll.filter((s) => !weakestSet.has(s.sourceWordId));

  const safeLimit = Math.min(limit, uniqueAll.length);
  const weakTarget = Math.min(
    Math.round(safeLimit * weakestRatio),
    weak.length,
  );

  const pickedWeak = shuffleArray(weak).slice(0, weakTarget);
  const pickedNormal = shuffleArray(normal).slice(
    0,
    safeLimit - pickedWeak.length,
  );

  const selected = [...pickedWeak, ...pickedNormal];

  if (selected.length < safeLimit) {
    const used = new Set(selected.map((s) => s.sentenceId));
    const remaining = shuffleArray(
      uniqueAll.filter((s) => !used.has(s.sentenceId)),
    );

    selected.push(...remaining.slice(0, safeLimit - selected.length));
  }

  return shuffleArray(selected);
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

    // Adjust this path only if your topic sentence CDN folder differs.
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

export default defineEventHandler(async (event) => {
  const auth = await requireUser(event);
  const userId = auth.sub;

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

  const sentenceSet = await loadSentenceSet(scope, slug);
  const allSentences = sentenceSet.items ?? [];

  if (!allSentences.length) {
    const sessionKey = crypto.randomUUID();

    const session: QuizSession = {
      version: 1,
      mode,
      scope,
      slug,
      createdAt: new Date().toISOString(),
      allowedSentences: [],
    };

    await redis.set(
      getSessionRedisKey(userId, sessionKey),
      JSON.stringify(session),
      { ex: QUIZ_SESSION_TTL_SECONDS },
    );

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

  const allWordIds = [...new Set(allSentences.map((s) => s.sourceWordId))];

  const progressRes = await db.query<{
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

  const xpMap = new Map<string, number>(
    progressRes.rows.map((row) => [row.word_id, Number(row.xp ?? 0)]),
  );

  const weakestIds = [...allWordIds].sort(
    (a, b) => (xpMap.get(a) ?? 0) - (xpMap.get(b) ?? 0),
  );

  const selected = pickWeightedSentences(
    allSentences,
    weakestIds,
    totalQuestions,
    weakestWordRatio,
  );

  const progress: Record<string, { xp: number }> = {};
  for (const sentence of selected) {
    progress[sentence.sourceWordId] = {
      xp: xpMap.get(sentence.sourceWordId) ?? 0,
    };
  }

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

  await redis.set(
    getSessionRedisKey(userId, sessionKey),
    JSON.stringify(session),
    { ex: QUIZ_SESSION_TTL_SECONDS },
  );

  return {
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
});