import { createError, readBody } from "h3";
import { db } from "~/server/db";
import { requireUser } from "~/server/utils/requireUser";

export default defineEventHandler(async (event) => {
  // 🔐 Require authenticated user
  const userId = await requireUser(event);

  const body = await readBody(event);
  const { wordId, correct } = body as {
    wordId: string;
    correct: boolean;
  };

  if (!wordId || typeof correct !== "boolean") {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid payload",
    });
  }

  // 1️⃣ Fetch existing row
  const { rows } = await db.query(
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
  const STREAK_CAP = 5;

  if (rows.length > 0) {
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
    delta = -12;
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
