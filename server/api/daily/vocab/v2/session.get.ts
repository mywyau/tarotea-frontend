import { createError, defineEventHandler } from "h3";
import { db } from "~/server/repositories/db";
import { requireUser } from "~/server/utils/requireUser";
import {
  DAILY_DISTRACTOR_COUNT,
  DAILY_MODE,
  DAILY_QUESTION_COUNT,
  DAILY_REQUIRED_WORDS,
  DailyQuestion,
  buildDailySessionKey,
  getUtcDayKey,
  shuffle,
} from "~/server/utils/dailyQuiz";

type DailySessionRow = {
  session_date: string;
  completed: boolean;
  word_ids: string[];
  answered_word_ids: string[] | null;
  answered_count: number;
  correct_count: number;
  xp_earned: number;
  total_questions: number;
};

type WordRow = {
  id: string;
  word: string;
  meaning: string;
};

type ProgressRow = {
  word_id: string;
  xp: number;
  streak: number;
};

type QuizEventRow = {
  processed: boolean;
};

async function getOrCreateDailySession(
  userId: string,
  mode: string,
  utcDayKey: string,
): Promise<DailySessionRow> {
  const existing = await db.query<DailySessionRow>(
    `
    select
      session_date::text,
      completed,
      word_ids,
      answered_word_ids,
      answered_count,
      correct_count,
      xp_earned,
      total_questions
    from daily_sessions
    where user_id = $1
      and session_date = $2::date
      and mode = $3
    limit 1
    `,
    [userId, utcDayKey, mode],
  );

  if (existing.rowCount) {
    return existing.rows[0];
  }

  const eligible = await db.query<{ word_id: string }>(
    `
    select word_id
    from user_word_progress
    where user_id = $1
    order by random()
    limit $2
    `,
    [userId, DAILY_QUESTION_COUNT],
  );

  const wordIds = eligible.rows.map((row) => row.word_id);

  if (!wordIds.length) {
    throw createError({
      statusCode: 400,
      statusMessage: "No eligible daily words found",
    });
  }

  const inserted = await db.query<DailySessionRow>(
    `
    insert into daily_sessions (
      user_id,
      session_date,
      mode,
      completed,
      word_ids,
      answered_word_ids,
      answered_count,
      correct_count,
      xp_earned,
      total_questions,
      created_at,
      updated_at
    )
    values (
      $1,
      $2::date,
      $3,
      false,
      $4::text[],
      $5::text[],
      0,
      0,
      0,
      $6,
      now(),
      now()
    )
    on conflict (user_id, session_date, mode)
    do update set updated_at = now()
    returning
      session_date::text,
      completed,
      word_ids,
      answered_word_ids,
      answered_count,
      correct_count,
      xp_earned,
      total_questions
    `,
    [userId, utcDayKey, mode, wordIds, [], wordIds.length],
  );

  return inserted.rows[0];
}

export default defineEventHandler(async (event) => {
  const auth = await requireUser(event);
  const userId = auth.sub;
  const mode = DAILY_MODE;
  const utcDayKey = getUtcDayKey();

  const countResult = await db.query<{ count: string }>(
    `
    select count(*)::text as count
    from user_word_progress
    where user_id = $1
    `,
    [userId],
  );

  const currentWordCount = Number(countResult.rows[0]?.count ?? 0);
  const dailyLocked = currentWordCount < DAILY_REQUIRED_WORDS;

  if (dailyLocked) {
    return {
      dailyLocked: true,
      requiredWords: DAILY_REQUIRED_WORDS,
      currentWordCount,
      dailyCompleted: false,
      backgroundStatus: "idle" as const,
      daily: {
        answeredCount: 0,
        correctCount: 0,
        xpEarned: 0,
        totalQuestions: 0,
      },
      questions: [],
    };
  }

  const session = await getOrCreateDailySession(userId, mode, utcDayKey);

  const wordIds = Array.isArray(session.word_ids) ? session.word_ids : [];

  if (!wordIds.length) {
    return {
      dailyLocked: false,
      requiredWords: DAILY_REQUIRED_WORDS,
      currentWordCount,
      dailyCompleted: false,
      backgroundStatus: "idle" as const,
      daily: {
        answeredCount: 0,
        correctCount: 0,
        xpEarned: 0,
        totalQuestions: 0,
      },
      questions: [],
    };
  }

  const wordsResult = await db.query<WordRow>(
    `
    select id, word, meaning
    from words
    where id = any($1::text[])
    `,
    [wordIds],
  );

  const progressResult = await db.query<ProgressRow>(
    `
    select word_id, xp, streak
    from user_word_progress
    where user_id = $1
      and word_id = any($2::text[])
    `,
    [userId, wordIds],
  );

  const distractorPoolResult = await db.query<WordRow>(
    `
    select id, word, meaning
    from words
    where not (id = any($1::text[]))
    order by random()
    limit $2
    `,
    [wordIds, Math.max(wordIds.length * 8, 24)],
  );

  const wordsById = new Map(wordsResult.rows.map((row) => [row.id, row]));
  const progressByWordId = new Map(
    progressResult.rows.map((row) => [row.word_id, row]),
  );

  const distractorPool = distractorPoolResult.rows;

  const questions: DailyQuestion[] = wordIds
    .map((wordId, index) => {
      const word = wordsById.get(wordId);
      if (!word) return null;

      const progress = progressByWordId.get(wordId);

      const distractors = distractorPool
        .filter((item) => item.id !== wordId)
        .slice(
          index * DAILY_DISTRACTOR_COUNT,
          index * DAILY_DISTRACTOR_COUNT + DAILY_DISTRACTOR_COUNT,
        );

      const fallbackDistractors =
        distractors.length === DAILY_DISTRACTOR_COUNT
          ? distractors
          : distractorPool
              .filter((item) => item.id !== wordId)
              .slice(0, DAILY_DISTRACTOR_COUNT);

      return {
        id: word.id,
        word: word.word,
        meaning: word.meaning,
        options: shuffle([word, ...fallbackDistractors]),
        progress: {
          xp: Number(progress?.xp ?? 0),
          streak: Number(progress?.streak ?? 0),
        },
      };
    })
    .filter((question): question is DailyQuestion => !!question);

  const sessionKey = buildDailySessionKey(mode, session.session_date, userId);

  const eventResult = await db.query<QuizEventRow>(
    `
    select processed
    from xp_quiz_events
    where session_key = $1
    limit 1
    `,
    [sessionKey],
  );

  const processed = !!eventResult.rows[0]?.processed;

  const backgroundStatus = session.completed
    ? processed
      ? "completed"
      : "processing"
    : "idle";

  return {
    dailyLocked: false,
    requiredWords: DAILY_REQUIRED_WORDS,
    currentWordCount,
    dailyCompleted: session.completed,
    backgroundStatus,
    daily: {
      answeredCount: session.answered_count ?? 0,
      correctCount: session.correct_count ?? 0,
      xpEarned: session.xp_earned ?? 0,
      totalQuestions: session.total_questions ?? questions.length,
    },
    questions,
  };
});