import { createError, readBody } from "h3";
import { db } from "~/server/db";
import { requireUser } from "~/server/utils/requireUser";

export default defineEventHandler(async (event) => {
  // 🔐 Require authenticated user
  const userId = await requireUser(event);

  const body = await readBody(event);

  const wordId = body.wordId as string;
  const correct = body.correct as boolean;

  // 🔒 Sanitize mode
  const mode = body.mode === "daily" ? "daily" : "normal";

  if (!wordId || typeof correct !== "boolean") {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid payload",
    });
  }

  // ✅ 1️⃣ Validate word exists BEFORE touching progress
  const wordCheck = await db.query(`select 1 from words where id = $1`, [
    wordId,
  ]);

  if (!wordCheck.rowCount) {
    throw createError({
      statusCode: 404,
      statusMessage: "Word not found",
    });
  }

  // 🛑 DAILY MODE PROTECTION
  if (mode === "daily") {
    const result = await db.query(
      `
      update daily_sessions
      set
        answered_word_ids = array_append(coalesce(answered_word_ids, '{}'), $2),
        answered_count = answered_count + 1,
        updated_at = now()
      where user_id = $1
        and session_date = current_date
        and completed = false
        and answered_count < total_questions
        and NOT ($2 = ANY(coalesce(answered_word_ids, '{}')))
      returning answered_count
    `,
      [userId, wordId],
    );

    // 🚫 If no row updated → block XP
    if (result.rowCount === 0) {
      return {
        success: false,
        delta: 0,
        dailyBlocked: true,
      };
    }
  }

  // 2 Fetch existing row
  const { rows } = await db.query(
    `
    select xp, streak, correct_count, wrong_count, last_seen_at
    from user_word_progress
    where user_id = $1 and word_id = $2
    `,
    [userId, wordId],
  );

  let xp = 0;
  let streak = 0;
  let correctCount = 0;
  let wrongCount = 0;
  const STREAK_CAP = 5;
  const COOLDOWN_MS = 1500; // 1.5 seconds

  if (rows.length > 0) {
    const lastSeen = rows[0].last_seen_at
      ? new Date(rows[0].last_seen_at)
      : null;

    if (lastSeen) {
      const now = new Date();
      const diff = now.getTime() - lastSeen.getTime();

      if (diff < COOLDOWN_MS) {
        return {
          success: false,
          delta: 0,
          newXp: rows[0].xp,
          newStreak: rows[0].streak,
          cooldown: true,
        };
      }
    }

    xp = rows[0].xp;
    streak = rows[0].streak;
    correctCount = rows[0].correct_count;
    wrongCount = rows[0].wrong_count;
  }

  // 🎯 XP Algorithm
  let delta = 0;

  if (correct) {
    const effectiveStreak = Math.min(streak, STREAK_CAP);
    delta = 5 + effectiveStreak * 2;

    xp += delta;
    streak += 1;
    correctCount += 1;
  } else {
    delta =
      mode === "daily"
        ? 0 // no negative xp in daily
        : -5;
    xp = Math.max(0, xp + delta);
    streak = 0;
    wrongCount += 1;
  }

  // 2️⃣ Upsert
  await db.query(
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

  return {
    success: true,
    delta,
    newXp: xp,
    newStreak: streak,
  };
});
