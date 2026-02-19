import type {
  DailySessionResponse,
  DailySessionRow,
} from "@/types/daily/DailyItem";

import { db } from "~/server/db";
import { requireUser } from "~/server/utils/requireUser";

export default defineEventHandler(
  async (event): Promise<DailySessionResponse> => {
    const userId = await requireUser(event);

    const DAILY_MIN_WORDS_REQUIRED = 20;
    const dailyNumberOfQuesions = 20;

    // 🔒 Check if user has enough studied words
    const wordCountResult = await db.query(
      `
    select count(*)::int as count
    from user_word_progress
    where user_id = $1
  `,
      [userId],
    );

    const studiedWordCount = wordCountResult.rows[0].count;

    if (studiedWordCount < DAILY_MIN_WORDS_REQUIRED) {
      return {
        locked: true,
        required: DAILY_MIN_WORDS_REQUIRED,
        current: studiedWordCount,
        completed: false,
        xpEarnedToday: 0,
        correctCount: 0,
        totalQuestions: 0,
        answeredCount: 0,
        words: [],
      };
    }

    // 1️⃣ Try get today's session
    const sessionResult = await db.query<DailySessionRow>(
      `
      select *
      from daily_sessions
      where user_id = $1
        and session_date = current_date
    `,
      [userId],
    );

    let session;

    if (sessionResult.rowCount === 0) {
      // 2️⃣ Generate 20 weakest words
      const wordsResult = await db.query(
        `
          select w.id, w.word, w.meaning
          from user_word_progress p
          join words w on w.id = p.word_id
          where p.user_id = $1
          order by
            p.xp asc,
            p.wrong_count desc,
            p.last_seen_at asc
          limit $2
      `,
        [userId, dailyNumberOfQuesions],
      );

      const wordIds = wordsResult.rows.map((w) => w.id);

      // 3️⃣ Insert locked session
      const insertResult = await db.query(
        `
      insert into daily_sessions
        (user_id, session_date, word_ids, total_questions)
      values
        ($1, current_date, $2, $3)
      returning *
      `,
        [userId, wordIds, wordIds.length],
      );

      session = insertResult.rows[0];

      return {
        locked: false,
        completed: false,
        xpEarnedToday: 0,
        correctCount: 0,
        totalQuestions: wordIds.length,
        answeredCount: 0,
        words: wordsResult.rows,
      };
    }

    session = sessionResult.rows[0];

    // 4️⃣ Fetch locked words
    if (!session.word_ids.length) {
      return {
        locked: false,
        completed: true,
        xpEarnedToday: session.xp_earned,
        correctCount: session.correct_count,
        totalQuestions: session.total_questions,
        answeredCount: session.answered_count,
        words: [],
      };
    }

    const wordsResult = await db.query(
      `
        select id, word, meaning
        from words
        where id = any($1)
        and NOT (id = any($2))
      `,
      [session.word_ids, session.answered_word_ids ?? []],
    );

    const remainingCount = session.total_questions - session.answered_count;

    return {
      locked: false,
      completed: session.completed,
      xpEarnedToday: session.xp_earned,
      correctCount: session.correct_count,
      totalQuestions: session.total_questions,
      answeredCount: session.answered_count,
      remainingCount,
      words: wordsResult.rows,
    };
  },
);
