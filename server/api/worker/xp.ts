import { db } from "~/server/db";
import { redis } from "~/server/redis";

export default defineEventHandler(async () => {
  console.log("XP worker triggered at:", new Date().toISOString());

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    let processedCount = 0;

    // Process up to 1000 events per run
    for (let i = 0; i < 1000; i++) {
      const id = await redis.rpop("xp_queue");
      if (!id) break;

      const eventResult = await client.query(
        `
        select *
        from xp_events
        where id = $1
          and processed = false
        for update skip locked
        `,
        [Number(id)],
      );

      if (!eventResult.rowCount) continue;

      const event = eventResult.rows[0];

      await client.query(
        `
          insert into user_word_progress
            (user_id, word_id, xp, streak, correct_count, wrong_count, last_seen_at, updated_at)
          values
            ($1, $2, greatest(0, $3), $4, $5, $6, now(), now())
          on conflict (user_id, word_id)
          do update set
            xp = greatest(0, user_word_progress.xp + $3),
            streak = case
                      when $7 = true then user_word_progress.streak + 1
                      else 0
                     end,
            correct_count = user_word_progress.correct_count + $5,
            wrong_count = user_word_progress.wrong_count + $6,
            last_seen_at = now(),
            updated_at = now()
        `,
        [
          event.user_id,
          event.word_id,
          event.delta,
          event.correct ? 1 : 0,
          event.correct ? 1 : 0,
          event.correct ? 0 : 1,
          event.correct,
        ],
      );

      await client.query(
        `
        update xp_events
        set processed = true,
            processed_at = now()
        where id = $1
        `,
        [event.id],
      );

      processedCount++;
    }

    await client.query("COMMIT");

    return { processed: processedCount };
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Worker error:", err);
    throw err;
  } finally {
    client.release();
  }
});
