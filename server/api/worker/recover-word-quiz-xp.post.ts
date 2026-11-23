import { createError, defineEventHandler, readRawBody } from "h3";
import { db } from "~/server/repositories/db";
import { verifyQuizWorkerRequest } from "~/server/utils/qstash/verifyQuizWorkerRequest";
import { publishWordQuizXp } from "~/server/utils/publishWordQuizXp";

export default defineEventHandler(async (event) => {
  const body = await readRawBody(event, "utf8");
  await verifyQuizWorkerRequest(event, body ?? "", "/api/worker/recover-word-quiz-xp");

  // Claim and release the rows before contacting QStash. A crashed sweep's
  // claims expire, and older untouched attempts go first on the next run.
  const { rows } = await db.query<{ userId: string; attemptId: string }>(`
    with due as (
      select id from xp_quiz_events
      where not processed and attempt_id is not null
        and mode in ('grind-level', 'grind-level-audio', 'grind-topic', 'grind-topic-audio')
        and coalesce(vocab_last_recovery_at, created_at) <= now() - interval '5 minutes'
      order by coalesce(vocab_last_recovery_at, created_at), id
      limit 20 for update skip locked
    )
    update xp_quiz_events e set vocab_last_recovery_at = now()
    from due where e.id = due.id
    returning e.user_id as "userId", e.attempt_id as "attemptId"
  `);
  const deliveries = await Promise.allSettled(rows.map(job => publishWordQuizXp(event, job)));
  const failed = deliveries.filter(result => result.status === "rejected").length;
  if (failed) {
    throw createError({ statusCode: 503, statusMessage: `Could not queue ${failed} vocabulary XP attempts` });
  }
  return { submitted: rows.length };
});
