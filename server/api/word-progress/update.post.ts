import { createError, readBody } from "h3";
import { db } from "~/server/db";
import { requireUser } from "~/server/utils/requireUser";

export default defineEventHandler(async (event) => {
  const userId = await requireUser(event);
  const body = await readBody(event);

  const wordId = body.wordId as string;
  const correct = body.correct as boolean;
  const mode = body.mode === "daily" ? "daily" : "normal";

  if (!wordId || typeof correct !== "boolean") {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid payload",
    });
  }

  const client = await db.connect();
  await client.query("BEGIN");

  try {
    // 1️⃣ Validate word exists
    const wordCheck = await client.query(`select 1 from words where id = $1`, [
      wordId,
    ]);

    if (!wordCheck.rowCount) {
      throw createError({ statusCode: 404, statusMessage: "Word not found" });
    }

    // 2️⃣ Fetch existing word progress
    const { rows } = await client.query(
      `
      select xp, streak, correct_count, wrong_count
      from user_word_progress
      where user_id = $1 and word_id = $2
    `,
      [userId, wordId],
    );

    let xp = 0;
    let streak = 0;
    let correctCount = 0;
    let wrongCount = 0;

    if (rows.length > 0) {
      xp = rows[0].xp;
      streak = rows[0].streak;
      correctCount = rows[0].correct_count;
      wrongCount = rows[0].wrong_count;
    }

    // 3️⃣ Compute delta FIRST
    let delta = 0;
    const STREAK_CAP = 5;

    if (correct) {
      const effectiveStreak = Math.min(streak, STREAK_CAP);
      delta = 5 + effectiveStreak * 2;
      xp += delta;
      streak += 1;
      correctCount += 1;
    } else {
      delta = mode === "daily" ? 0 : -5;
      xp = Math.max(0, xp + delta);
      streak = 0;
      wrongCount += 1;
    }

    // 4️⃣ DAILY SESSION UPDATE (uses computed delta)
    let dailySnapshot = null;

    if (mode === "daily") {
      const result = await client.query(
        `
          update daily_sessions
          set
            answered_word_ids = array_append(coalesce(answered_word_ids, '{}'), $2),
            answered_count = answered_count + 1,
            correct_count = correct_count + CASE WHEN $3 THEN 1 ELSE 0 END,
            xp_earned = xp_earned + $4,
            updated_at = now()
          where user_id = $1
            and session_date = current_date
            and completed = false
            and answered_count < total_questions
            and NOT ($2 = ANY(coalesce(answered_word_ids, '{}')))
          returning answered_count, correct_count, xp_earned, total_questions
        `,
        [userId, wordId, correct, delta],
      );

      if (result.rowCount === 0) {
        await client.query("ROLLBACK");
        return {
          success: false,
          delta: 0,
          dailyBlocked: true,
        };
      }

      dailySnapshot = result.rows[0];
    }

    // 5️⃣ Upsert word progress
    await client.query(
      `
        insert into user_word_progress
          (user_id, word_id, xp, streak, correct_count, wrong_count, last_seen_at, updated_at)
        values
          ($1, $2, $3, $4, $5, $6, now(), now())
        on conflict (user_id, word_id)
        do update set
          xp = $3,
          streak = $4,
          correct_count = $5,
          wrong_count = $6,
          last_seen_at = now(),
          updated_at = now()
      `,
      [userId, wordId, xp, streak, correctCount, wrongCount],
    );

    await client.query("COMMIT");

    return {
      success: true,
      delta,
      newXp: xp,
      newStreak: streak,
      daily: dailySnapshot
        ? {
            answeredCount: dailySnapshot.answered_count,
            correctCount: dailySnapshot.correct_count,
            xpEarned: dailySnapshot.xp_earned,
            totalQuestions: dailySnapshot.total_questions,
          }
        : null,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});
