import { db } from "~/server/db";

type Payload = {
  answers: Array<{ wordId: string; correct: boolean; delta: number }>;
};

export default defineEventHandler(async () => {
  console.log("[xp-quiz worker] invoked");

  const client = await db.connect();
  await client.query("BEGIN");

  try {
    const batchRes = await client.query(
      `
      select id, user_id, payload
      from xp_quiz_events
      where processed = false
      order by id
      limit 200
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

      // ✅ normalize jsonb (could be object or string)
      const payload: Payload =
        typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload;

      const answers = payload?.answers ?? [];
      if (answers.length === 0) {
        processedIds.push(eventId);
        continue;
      }

      // ✅ dedupe by wordId to avoid “cannot affect row a second time”
      const byWord = new Map<string, { delta: number; correct: boolean }>();
      for (const a of answers) {
        if (!a?.wordId) continue;
        const prev = byWord.get(a.wordId);
        if (!prev)
          byWord.set(a.wordId, { delta: a.delta ?? 0, correct: !!a.correct });
        else
          byWord.set(a.wordId, {
            delta: prev.delta + (a.delta ?? 0),
            correct: prev.correct || !!a.correct,
          });
      }

      const wordIds = [...byWord.keys()];
      if (wordIds.length === 0) {
        processedIds.push(eventId);
        continue;
      }

      const deltas = wordIds.map((id) => byWord.get(id)!.delta);
      const corrects = wordIds.map((id) => byWord.get(id)!.correct);

      await client.query(
        `
            insert into user_word_progress
              (user_id, word_id, xp, streak, correct_count, wrong_count, last_seen_at, last_correct_at, updated_at)
            select
              $1::text,
              u.word_id,
              greatest(0, u.delta),
              case when u.correct then 1 else 0 end, -- initial streak for new word
              case when u.correct then 1 else 0 end,
              case when u.correct then 0 else 1 end,
              now(),
              case when u.correct then now() else null end,
              now()
            from unnest($2::text[], $3::int[], $4::boolean[])
              as u(word_id, delta, correct)
            on conflict (user_id, word_id)
            do update set
              xp = greatest(0, user_word_progress.xp + excluded.xp),
              streak = case
                when excluded.correct_count = 1 then user_word_progress.streak + 1
                else 0
              end,
              correct_count = user_word_progress.correct_count + excluded.correct_count,
              wrong_count = user_word_progress.wrong_count + excluded.wrong_count,
              last_seen_at = now(),
              last_correct_at = case
                when excluded.correct_count = 1 then now()
                else user_word_progress.last_correct_at
              end,
              updated_at = now()
        `,
        [userId, wordIds, deltas, corrects],
      );

      applied += wordIds.length; // count unique words applied
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
