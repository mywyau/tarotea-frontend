import { createError, getHeader, readBody } from "h3";
import { db } from "~/server/db";
import { requireUser } from "~/server/utils/requireUser";
import type {
  Attempt,
  BatchAttempt,
} from "~/types/jyutping/jyutping-training-types";

export default defineEventHandler(async (event) => {
  const userId = await requireUser(event);

  const body = (await readBody(event)) as {
    level: string;
    sessionKey: string;
    attempts: BatchAttempt[];
    mode: string;
  };

  if (!body || !Array.isArray(body.attempts)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid payload" });
  }

  // de-dupe by wordId (first occurrence wins)
  const map = new Map<string, BatchAttempt>();

  for (const a of body.attempts) {
    if (!a?.wordId) continue;
    if (!map.has(a.wordId)) {
      map.set(a.wordId, {
        wordId: a.wordId,
        passed: !!a.passed,
        hintUsed: !!a.hintUsed,
      });
    }
  }

  const attempts = [...map.values()];

  if (attempts.length === 0) {
    throw createError({ statusCode: 400, statusMessage: "No attempts" });
  }

  const client = await db.connect();
  await client.query("BEGIN");

  try {
    // fetch current streaks
    const streakMap = new Map<string, number>();

    const streakRes = await client.query(
      `
      select word_id, streak
      from user_word_progress
      where user_id = $1 and word_id = any($2::text[])
      `,
      [userId, attempts.map((a) => a.wordId)],
    );

    for (const r of streakRes.rows) {
      streakMap.set(r.word_id, Number(r.streak ?? 0));
    }

    function deltaFor(a: BatchAttempt, mode: string) {
      if (!a.passed) return 0;

      switch (mode) {
        case "grind-level":
          return a.hintUsed ? 1 : 3;
        case "grind-topic":
          return a.hintUsed ? 1 : 3;

        case "grind-chinese-level":
          return a.hintUsed ? 3 : 10; // slightly harder

        case "grind-chinese-topic":
          return a.hintUsed ? 3 : 10; // slightly harder

        case "grind-chinese-sentences-level":
          return a.hintUsed ? 5 : 15; // slightly harder
        default:
          return a.hintUsed ? 1 : 3;
      }
    }

    const payloadAttempts: Attempt[] = attempts.map((a) => ({
      wordId: a.wordId,
      passed: a.passed,
      delta: deltaFor(a, body.mode),
    }));

    const correctCount = payloadAttempts.filter((a) => a.passed).length;
    const totalDelta = payloadAttempts.reduce((acc, a) => acc + a.delta, 0);

    await client.query(
      `
      insert into xp_jyutping_events
        (
          user_id,
          mode,
          level,
          session_key,
          payload, 
          total_delta,
          correct_count,
          total_questions
        ) values
        ($1, $2, $3, $4, $5::jsonb, $6, $7, $8)
      `,
      [
        userId,
        body.mode,
        body.level,
        body.sessionKey,
        JSON.stringify({ answers: payloadAttempts }),
        totalDelta,
        correctCount,
        payloadAttempts.length,
      ],
    );

    await client.query("COMMIT");

    // trigger worker
    const host =
      getHeader(event, "x-forwarded-host") ?? getHeader(event, "host");
    const proto = getHeader(event, "x-forwarded-proto") ?? "https";

    if (host) {
      fetch(`${proto}://${host}/api/worker/xp-jyutping`, {
        method: "POST",
      }).catch(() => {});
    }

    return {
      session: {
        xpEarned: totalDelta,
        correctCount: correctCount,
        totalWords: payloadAttempts.length,
      },
    };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
});
