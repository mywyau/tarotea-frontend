import { createError, readBody } from "h3";
import { db } from "~/server/db";
import { redis } from "~/server/redis";
import { requireUser } from "~/server/utils/requireUser";

export default defineEventHandler(async (event) => {
  const userId = await requireUser(event);
  const body = await readBody(event);

  const wordId = body.wordId as string;
  const correct = body.correct as boolean;
  const mode = body.mode === "daily" ? "daily" : "normal";

  if (!wordId || typeof correct !== "boolean") {
    throw createError({ statusCode: 400, statusMessage: "Invalid payload" });
  }

  const client = await db.connect();
  await client.query("BEGIN");

  try {
    // 1️⃣ Validate word exists
    const wordCheck = await client.query(
      `select 1 from words where id = $1`,
      [wordId]
    );

    if (!wordCheck.rowCount) {
      throw createError({ statusCode: 404, statusMessage: "Word not found" });
    }

    // 2️⃣ Fetch current progress (for delta calculation only)
    const { rows } = await client.query(
      `
      select xp, streak
      from user_word_progress
      where user_id = $1 and word_id = $2
    `,
      [userId, wordId]
    );

    let xp = rows[0]?.xp ?? 0;
    let streak = rows[0]?.streak ?? 0;

    // 3️⃣ Compute delta
    let delta = 0;
    const STREAK_CAP = 5;

    if (correct) {
      const effectiveStreak = Math.min(streak, STREAK_CAP);
      delta = 5 + effectiveStreak * 2;
      xp += delta;
      streak += 1;
    } else {
      delta = mode === "daily" ? 0 : -5;
      xp = Math.max(0, xp + delta);
      streak = 0;
    }

    // 4️⃣ Update daily session synchronously
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
        [userId, wordId, correct, delta]
      );

      if (!result.rowCount) {
        await client.query("ROLLBACK");
        return {
          success: false,
          delta: 0,
          dailyBlocked: true,
        };
      }

      dailySnapshot = result.rows[0];
    }

    // 5️⃣ Insert XP event instead of mutating state
    const insertResult = await client.query(
      `
      insert into xp_events
        (user_id, word_id, delta, correct, source)
      values
        ($1, $2, $3, $4, $5)
      returning id
      `,
      [userId, wordId, delta, correct, mode]
    );

    const eventId = insertResult.rows[0].id;

    await client.query("COMMIT");

    // 6️⃣ Push to Redis queue (outside transaction)
    await redis.lpush("xp_queue", String(eventId));

    // 7️⃣ Optional: trigger worker immediately (fire and forget)
    fetch(`${process.env.BASE_URL}/api/worker/xp`).catch(() => {});

    return {
      success: true,
      delta,
      optimisticXp: xp,
      optimisticStreak: streak,
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