import { db } from "~/server/db";
import { redis } from "~/server/redis";
import { createError } from "h3";

export default defineEventHandler(async (event) => {

  console.log("XP worker triggered at:", new Date().toISOString());

  const ids = await redis.lrange("xp_queue", 0, 49);

  if (!ids.length) {
    return { processed: 0 };
  }

  const numericIds = ids
    .map((id) => Number(id))
    .filter((n) => !Number.isNaN(n));

  if (!numericIds.length) {
    await redis.ltrim("xp_queue", ids.length, -1);
    return { processed: 0 };
  }

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const eventsResult = await client.query(
      `
      select *
      from xp_events
      where id = any($1::bigint[])
        and processed = false
      order by id asc
      `,
      [numericIds],
    );

    const events = eventsResult.rows;

    if (!events.length) {
      await client.query("COMMIT");
      await redis.ltrim("xp_queue", ids.length, -1);
      return { processed: 0 };
    }

    for (const event of events) {
      // UPSERT mutation
      await client.query(
        `
        insert into user_word_progress
          (user_id, word_id, xp, streak, correct_count, wrong_count, last_seen_at, updated_at)
        values
          ($1, $2, $3, $4, $5, $6, now(), now())
        on conflict (user_id, word_id)
        do update set
          xp = user_word_progress.xp + $3,
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
          event.correct ? 1 : 0, // streak initial
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
    }

    await client.query("COMMIT");

    // trim only processed amount
    await redis.ltrim("xp_queue", events.length, -1);

    return { processed: events.length };
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Worker error:", err);
    throw err;
  } finally {
    client.release();
  }
});
