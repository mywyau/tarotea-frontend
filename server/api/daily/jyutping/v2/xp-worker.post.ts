// server/api/daily/jyutping/v2/xp-worker.post.ts


import { Receiver } from "@upstash/qstash";
import {
  createError,
  defineEventHandler,
  getHeader,
  readRawBody,
} from "h3";
import { db } from "~/server/repositories/db";

type WorkerBody = {
  eventId: number | string;
  userId: string;
  sessionKey?: string;
};

type Payload = {
  answers: Array<{
    wordId: string;
    correct: boolean;
    delta: number;
  }>;
};

type AggregatedWord = {
  wordId: string;
  delta: number;
  correct: boolean;
};

const MASTERY_CAP = 1000;

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw createError({
      statusCode: 500,
      statusMessage: `Missing env var: ${name}`,
    });
  }
  return value;
}

function getReceiver() {
  return new Receiver({
    currentSigningKey: requiredEnv("QSTASH_CURRENT_SIGNING_KEY"),
    nextSigningKey: requiredEnv("QSTASH_NEXT_SIGNING_KEY"),
  });
}

function getPublicUrl(event: Parameters<typeof defineEventHandler>[0] extends (
  event: infer E,
) => any
  ? E
  : never): string {
  const proto = getHeader(event, "x-forwarded-proto") ?? "https";
  const host =
    getHeader(event, "x-forwarded-host") ?? getHeader(event, "host");

  if (!host) {
    throw createError({
      statusCode: 500,
      statusMessage: "Missing host header for QStash verification",
    });
  }

  return `${proto}://${host}${event.path}`;
}

function aggregateAnswers(
  answers: Payload["answers"],
): AggregatedWord[] {
  const byWord = new Map<string, AggregatedWord>();

  for (const answer of answers) {
    if (!answer?.wordId) continue;

    const existing = byWord.get(answer.wordId);

    if (!existing) {
      byWord.set(answer.wordId, {
        wordId: answer.wordId,
        delta: Number(answer.delta ?? 0),
        correct: !!answer.correct,
      });
      continue;
    }

    byWord.set(answer.wordId, {
      wordId: answer.wordId,
      delta: existing.delta + Number(answer.delta ?? 0),
      correct: existing.correct || !!answer.correct,
    });
  }

  return [...byWord.values()];
}

export default defineEventHandler(async (event) => {
  const signature =
    getHeader(event, "upstash-signature") ??
    getHeader(event, "Upstash-Signature");

  if (!signature) {
    throw createError({
      statusCode: 401,
      statusMessage: "Missing Upstash-Signature header",
    });
  }

  const rawBody = (await readRawBody(event, "utf8")) ?? "";

  try {
    await getReceiver().verify({
      signature,
      body: rawBody,
      url: getPublicUrl(event),
    });
  } catch {
    throw createError({
      statusCode: 401,
      statusMessage: "Invalid QStash signature",
    });
  }

  let body: WorkerBody;

  try {
    body = JSON.parse(rawBody) as WorkerBody;
  } catch {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid JSON body",
    });
  }

  const eventId = Number(body.eventId);
  const userId = body.userId;

  if (!Number.isFinite(eventId) || !userId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing or invalid eventId/userId",
    });
  }

  console.log("[xp-jyutping worker v2] invoked", {
    eventId,
    userId,
    sessionKey: body.sessionKey ?? null,
  });

  const client = await db.connect();
  await client.query("BEGIN");

  try {
    const eventRes = await client.query(
      `
      select id, user_id, payload, processed
      from xp_jyutping_events
      where id = $1
        and user_id = $2
      for update
      `,
      [eventId, userId],
    );

    if (!eventRes.rowCount) {
      await client.query("COMMIT");

      return {
        ok: true,
        skipped: "event_not_found",
        eventId,
      };
    }

    const row = eventRes.rows[0];

    if (row.processed) {
      await client.query("COMMIT");

      return {
        ok: true,
        skipped: "already_processed",
        eventId,
      };
    }

    const payload: Payload =
      typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload;

    const answers = payload?.answers ?? [];

    if (!answers.length) {
      await client.query(
        `
        update xp_jyutping_events
        set processed = true,
            processed_at = now()
        where id = $1
        `,
        [eventId],
      );

      await client.query("COMMIT");

      return {
        ok: true,
        processedJyutpingEvents: 1,
        appliedAnswers: 0,
        eventId,
      };
    }

    const aggregated = aggregateAnswers(answers);
    const wordIds = aggregated.map((item) => item.wordId);

    if (!wordIds.length) {
      await client.query(
        `
        update xp_jyutping_events
        set processed = true,
            processed_at = now()
        where id = $1
        `,
        [eventId],
      );

      await client.query("COMMIT");

      return {
        ok: true,
        processedJyutpingEvents: 1,
        appliedAnswers: 0,
        eventId,
      };
    }

    const deltas = aggregated.map((item) => item.delta);
    const corrects = aggregated.map((item) => item.correct);

    await client.query(
      `
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
        u.word_id,
        greatest(0, u.delta),
        case when u.correct then 1 else 0 end,
        case when u.correct then 1 else 0 end,
        case when u.correct then 0 else 1 end,
        now(),
        case when u.correct then now() else null end,
        now()
      from unnest($2::text[], $3::int[], $4::boolean[])
        as u(word_id, delta, correct)
      on conflict (user_id, word_id)
      do update set
        xp = least(
               $5::int,
               greatest(0, user_word_progress.xp + excluded.xp)
             ),
        streak = case
          when excluded.correct_count = 1
            then least($5::int, user_word_progress.streak + 1)
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
      [userId, wordIds, deltas, corrects, MASTERY_CAP],
    );

    await client.query(
      `
      update xp_jyutping_events
      set processed = true,
          processed_at = now()
      where id = $1
      `,
      [eventId],
    );

    await client.query("COMMIT");

    return {
      ok: true,
      processedJyutpingEvents: 1,
      appliedAnswers: wordIds.length,
      eventId,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
});