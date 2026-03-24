// server/api/worker/xp-quiz.post.ts

import { db } from "~/server/repositories/db";
import { redis } from "~/server/repositories/redis";

type Payload = {
  answers: Array<{ wordId: string; correct: boolean; delta: number }>;
};

type UpdatedWordProgressRow = {
  word_id: string;
  xp: number;
  streak: number;
};

export default defineEventHandler(async () => {
  console.log("[xp-quiz worker] invoked");

  const MASTERY_CAP = 500;

  const client = await db.connect();
  await client.query("BEGIN");

  // Collect Redis writes grouped by user, then apply after COMMIT
  const redisWritesByUser = new Map<string, Record<string, string>>();

  try {
    const batchRes = await client.query(
      `
      select id, user_id, payload
      from xp_quiz_events
      where processed = false
      order by id
      limit 1000
      for update skip locked
      `,
    );

    if (!batchRes.rowCount) {
      await client.query("COMMIT");
      return { processedQuizEvents: 0, appliedAnswers: 0 };
    }

    let applied = 0;
    const processedIds: number[] = [];

    for (const row of batchRes.rows) {
      const eventId = Number(row.id);
      const userId = row.user_id as string;

      const payload: Payload =
        typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload;

      const answers = payload?.answers ?? [];

      if (answers.length === 0) {
        processedIds.push(eventId);
        continue;
      }

      // Dedupe by wordId inside this event
      const byWord = new Map<string, { delta: number; correct: boolean }>();

      for (const a of answers) {
        if (!a?.wordId) continue;

        const prev = byWord.get(a.wordId);

        if (!prev) {
          byWord.set(a.wordId, {
            delta: a.delta ?? 0,
            correct: !!a.correct,
          });
        } else {
          byWord.set(a.wordId, {
            delta: prev.delta + (a.delta ?? 0),
            correct: prev.correct || !!a.correct,
          });
        }
      }

      const wordIds = [...byWord.keys()];

      if (wordIds.length === 0) {
        processedIds.push(eventId);
        continue;
      }

      const deltas = wordIds.map((id) => byWord.get(id)!.delta);
      const corrects = wordIds.map((id) => byWord.get(id)!.correct);

      const upsertRes = await client.query<UpdatedWordProgressRow>(
        `
  with input_rows as (
    select *
    from unnest($2::text[], $3::int[], $4::boolean[])
      as u(word_id, delta, correct)
  )
  insert into user_word_progress
    (
      user_id,
      word_id,
      xp,
      streak,
      correct_count,
      wrong_count,
      last_seen_at,
      last_correct_at,
      updated_at
    )
  select
    $1::text,
    i.word_id,
    least($5::int, greatest(0, i.delta)),
    case when i.correct then 1 else 0 end,
    case when i.correct then 1 else 0 end,
    case when i.correct then 0 else 1 end,
    now(),
    case when i.correct then now() else null end,
    now()
  from input_rows i
  on conflict (user_id, word_id)
  do update set
    xp = least(
      $5::int,
      greatest(0, user_word_progress.xp + (
        select i.delta
        from input_rows i
        where i.word_id = user_word_progress.word_id
      ))
    ),
    streak = case
      when (
        select i.correct
        from input_rows i
        where i.word_id = user_word_progress.word_id
      )
      then user_word_progress.streak + 1
      else 0
    end,
    correct_count = user_word_progress.correct_count + case
      when (
        select i.correct
        from input_rows i
        where i.word_id = user_word_progress.word_id
      )
      then 1 else 0
    end,
    wrong_count = user_word_progress.wrong_count + case
      when (
        select i.correct
        from input_rows i
        where i.word_id = user_word_progress.word_id
      )
      then 0 else 1
    end,
    last_seen_at = now(),
    last_correct_at = case
      when (
        select i.correct
        from input_rows i
        where i.word_id = user_word_progress.word_id
      )
      then now()
      else user_word_progress.last_correct_at
    end,
    updated_at = now()
  returning word_id, xp, streak
  `,
        [userId, wordIds, deltas, corrects, MASTERY_CAP],
      );

      // Stage Redis refresh data for this user
      const existingWrites = redisWritesByUser.get(userId) ?? {};

      for (const updated of upsertRes.rows) {
        existingWrites[updated.word_id] = JSON.stringify({
          xp: Number(updated.xp ?? 0),
          streak: Number(updated.streak ?? 0),
        });
      }

      redisWritesByUser.set(userId, existingWrites);

      applied += wordIds.length;
      processedIds.push(eventId);
    }

    await client.query(
      `
      update xp_quiz_events
      set processed = true, processed_at = now()
      where id = any($1::bigint[])
      `,
      [processedIds],
    );

    await client.query("COMMIT");

    // Best-effort Redis refresh after commit
    for (const [userId, redisWrites] of redisWritesByUser.entries()) {
      try {
        if (Object.keys(redisWrites).length > 0) {
          await redis.hset(`word_progress:${userId}`, redisWrites);
        }
      } catch (error) {
        console.error("[xp-quiz worker] Redis HSET failed", {
          userId,
          error,
        });
      }
    }

    return {
      processedQuizEvents: processedIds.length,
      appliedAnswers: applied,
    };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
});
