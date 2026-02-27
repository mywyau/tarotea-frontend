import { createError, getHeader, readBody } from "h3";
import { db } from "~/server/db";
import { requireUser } from "~/server/utils/requireUser";

type Attempt = {
  wordId: string;
  passed: boolean;
  perfect: boolean;
  hintUsed?: boolean;
};

export default defineEventHandler(async (event) => {
  const userId = await requireUser(event);
  const body = (await readBody(event)) as {
    attempts: Attempt[];
    level: string;
    sessionKey: string;
  };

  if (!body || !Array.isArray(body.attempts)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid payload" });
  }

  // de-dupe by wordId (first occurrence wins)
  const map = new Map<string, Attempt>();

  for (const a of body.attempts) {
    if (!a?.wordId) continue;
    if (!map.has(a.wordId)) {
      map.set(a.wordId, {
        wordId: a.wordId,
        passed: !!a.passed,
        perfect: !!a.perfect,
        hintUsed: !!(a as any).hintUsed,
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

    function deltaFor(a: Attempt) {
      if (!a.passed) return 0;

      if (a.hintUsed) {
        return a.perfect ? 1 : 1;
      }

      if (a.perfect) return 7;
      return 1;
    }

    const payloadAttempts = attempts.map((a) => ({
      wordId: a.wordId,
      passed: a.passed,
      perfect: a.perfect,
      delta: deltaFor(a),
    }));

    const correctCount = payloadAttempts.filter((a) => a.passed).length;
    const totalDelta = payloadAttempts.reduce((acc, a) => acc + a.delta, 0);

    await client.query(
      `
      insert into xp_jyutping_events
        (
          user_id,
          level,
          session_key,
          payload, 
          total_delta,
          correct_count,
          total_words
        ) values
        ($1, $2, $3, $4::jsonb, $5, $6, $7)
      `,
      [
        userId,
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
        correctCount,
        totalWords: payloadAttempts.length,
        xpEarned: totalDelta,
      },
    };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
});
