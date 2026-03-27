import { createError, getQuery } from "h3";
import { db } from "~/server/repositories/db";
import { redis } from "~/server/repositories/redis";
import { requireUser } from "~/server/utils/requireUser";
import { levelTitles } from "~/utils/levels/levels";
import { generateWeightedWordsLevel } from "~/utils/quiz/generateWeightedWordsLevel";
import { totalQuestions, weakestWordRatio } from "~/utils/weakestWords";

const QUIZ_SESSION_TTL_SECONDS = 60 * 30;

type VocabWord = {
  id: string;
  word: string;
  jyutping: string;
  meaning: string;
};

type LevelData = {
  categories: Record<string, VocabWord[]>;
};

type QuizSession = {
  version: 1;
  mode: "dojo-level-jyutping";
  scope: "level";
  slug: string;
  createdAt: string;
  allowedWordIds: string[];
};

export default defineEventHandler(async (event) => {
  const auth = await requireUser(event);
  const userId = auth.sub;

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

  let levelData: LevelData;

  try {
    levelData = await $fetch<LevelData>(`${cdnBase}/vocab-quiz/${slug}.json`);
  } catch {
    throw createError({
      statusCode: 404,
      statusMessage: "Vocab quiz set not found",
    });
  }

  const allWords = Object.values(levelData.categories ?? {}).flat();

  if (!allWords.length) {
    const sessionKey = crypto.randomUUID();

    const session: QuizSession = {
      version: 1,
      mode: "dojo-level-jyutping",
      scope: "level",
      slug,
      createdAt: new Date().toISOString(),
      allowedWordIds: [],
    };

    await redis.set(
      `dojo:jyutping:level:${userId}:${sessionKey}`,
      JSON.stringify(session),
      { ex: QUIZ_SESSION_TTL_SECONDS },
    );

    return {
      sessionKey,
      session: {
        mode: "dojo-level-jyutping" as const,
        level: slug,
        title: `Jyutping Dojo - ${levelTitles[slug] ?? slug}`,
        totalWords: 0,
        words: [],
      },
      progress: {},
    };
  }

  const allWordIds = [...new Set(allWords.map((w) => w.id))];

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

  const weakestIds = [...allWords]
    .map((w) => ({
      id: w.id,
      xp: xpMap.get(w.id) ?? 0,
    }))
    .sort((a, b) => a.xp - b.xp)
    .map((w) => w.id);

  const selected = generateWeightedWordsLevel(allWords, weakestIds, {
    totalQuestions,
    weakestRatio: weakestWordRatio,
  });

  const progress: Record<string, { xp: number }> = {};
  for (const word of selected) {
    progress[word.id] = {
      xp: xpMap.get(word.id) ?? 0,
    };
  }

  const sessionKey = crypto.randomUUID();

  const session: QuizSession = {
    version: 1,
    mode: "dojo-level-jyutping",
    scope: "level",
    slug,
    createdAt: new Date().toISOString(),
    allowedWordIds: selected.map((w) => w.id),
  };

  await redis.set(
    `dojo:jyutping:level:${userId}:${sessionKey}`,
    JSON.stringify(session),
    { ex: QUIZ_SESSION_TTL_SECONDS },
  );

  return {
    sessionKey,
    session: {
      mode: "dojo-level-jyutping" as const,
      level: slug,
      title: `Jyutping Dojo - ${levelTitles[slug] ?? slug}`,
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
});
