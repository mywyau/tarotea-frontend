import { createError, defineEventHandler } from "h3";
import { Receiver } from "@upstash/qstash";
import { useRuntimeConfig } from "#imports";
import { db } from "~/server/repositories/db";

type WorkerJob = {
  attemptId: string;
  userId: string;
};

type PayloadAnswer = {
  wordId: string;
  correct: boolean;
  delta: number;
};

type QuizEventRow = {
  id: string | number;
  payload: unknown;
  processed: boolean;
};

type AggregatedWordUpdate = {
  wordId: string;
  delta: number;
  correct: boolean;
};

function parseWorkerJob(raw: string): WorkerJob {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid worker payload JSON",
    });
  }

  if (!parsed || typeof parsed !== "object") {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid worker payload",
    });
  }

  const attemptId = (parsed as { attemptId?: unknown }).attemptId;
  const userId = (parsed as { userId?: unknown }).userId;

  if (typeof attemptId !== "string" || !attemptId.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing attemptId",
    });
  }

  if (typeof userId !== "string" || !userId.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing userId",
    });
  }

  return {
    attemptId: attemptId.trim(),
    userId: userId.trim(),
  };
}

function parsePayloadAnswers(payload: unknown): PayloadAnswer[] {
  let parsedPayload = payload;

  if (typeof payload === "string") {
    try {
      parsedPayload = JSON.parse(payload);
    } catch {
      throw createError({
        statusCode: 500,
        statusMessage: "Stored quiz payload is not valid JSON",
      });
    }
  }

  const answers = (parsedPayload as { answers?: unknown })?.answers;

  if (!Array.isArray(answers)) {
    throw createError({
      statusCode: 500,
      statusMessage: "Stored quiz payload is missing answers",
    });
  }

  const normalized: PayloadAnswer[] = [];

  for (const item of answers) {
    if (!item || typeof item !== "object") continue;

    const wordId = (item as { wordId?: unknown }).wordId;
    const correct = (item as { correct?: unknown }).correct;
    const delta = (item as { delta?: unknown }).delta;

    if (typeof wordId !== "string" || !wordId.trim()) continue;
    if (typeof correct !== "boolean") continue;
    if (typeof delta !== "number" || !Number.isFinite(delta)) continue;

    normalized.push({
      wordId: wordId.trim(),
      correct,
      delta,
    });
  }

  if (normalized.length === 0) {
    throw createError({
      statusCode: 500,
      statusMessage: "Stored quiz payload contains no valid answers",
    });
  }

  return normalized;
}

function aggregateAnswers(answers: PayloadAnswer[]): AggregatedWordUpdate[] {
  const map = new Map<string, AggregatedWordUpdate>();

  for (const answer of answers) {
    const existing = map.get(answer.wordId);

    if (!existing) {
      map.set(answer.wordId, {
        wordId: answer.wordId,
        delta: answer.delta,
        correct: answer.correct,
      });
      continue;
    }

    existing.delta += answer.delta;

    // Defensive rule:
    // if duplicates somehow slip in, any wrong answer resets streak.
    existing.correct = existing.correct && answer.correct;
  }

  return [...map.values()];
}

async function verifyQStashRequest(
  event: Parameters<typeof defineEventHandler>[0],
  rawBody: string,
): Promise<void> {

  const config = useRuntimeConfig(event);

  const currentSigningKey = config.qstashCurrentSigningKey as string | undefined;
  const nextSigningKey = config.qstashNextSigningKey as string | undefined;
  const appBaseUrl = config.siteUrl as string | undefined;

  if (!currentSigningKey || !nextSigningKey) {
    throw createError({
      statusCode: 500,
      statusMessage: "Missing QStash signing keys",
    });
  }

  if (!appBaseUrl) {
    throw createError({
      statusCode: 500,
      statusMessage: "Missing appBaseUrl",
    });
  }

  const signature = event.req.headers.get("Upstash-Signature");

  if (!signature) {
    throw createError({
      statusCode: 401,
      statusMessage: "Missing Upstash signature",
    });
  }

  const receiver = new Receiver({
    currentSigningKey,
    nextSigningKey,
  });

  const workerUrl = `${appBaseUrl.replace(/\/+$/, "")}/api/worker/xp-quiz-v3`;

  const isValid = await receiver.verify({
    signature,
    body: rawBody,
    url: workerUrl,
  });

  if (!isValid) {
    throw createError({
      statusCode: 401,
      statusMessage: "Invalid Upstash signature",
    });
  }
}

export default defineEventHandler(async (event) => {
  // Important: use the raw request body for signature verification.
  const rawBody = await event.req.text();

  await verifyQStashRequest(event, rawBody);

  const job = parseWorkerJob(rawBody);
  const qstashMessageId = event.req.headers.get("Upstash-Message-Id");
  const qstashRetried = event.req.headers.get("Upstash-Retried");

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const eventResult = await client.query<QuizEventRow>(
      `
      select id, payload, processed
      from xp_quiz_events
      where user_id = $1
        and attempt_id = $2
      for update
      `,
      [job.userId, job.attemptId],
    );

    const quizEvent = eventResult.rows[0];

    if (!quizEvent) {
      throw createError({
        statusCode: 500,
        statusMessage: "Quiz event not found for worker job",
      });
    }

    if (quizEvent.processed) {
      await client.query("COMMIT");

      return {
        ok: true,
        status: "already-processed",
        attemptId: job.attemptId,
        messageId: qstashMessageId,
        retried: qstashRetried,
      };
    }

    const payloadAnswers = parsePayloadAnswers(quizEvent.payload);
    const updates = aggregateAnswers(payloadAnswers);

    const wordIds = updates.map((u) => u.wordId);
    const deltas = updates.map((u) => u.delta);
    const correctFlags = updates.map((u) => u.correct);

    await client.query(
      `
      insert into user_word_progress
        (user_id, word_id, xp, streak, created_at, updated_at)
      select
        $1::text as user_id,
        data.word_id,
        data.delta,
        case when data.correct then 1 else 0 end as streak,
        now(),
        now()
      from unnest($2::text[], $3::int[], $4::boolean[]) as data(word_id, delta, correct)
      on conflict (user_id, word_id)
      do update
      set
        xp = coalesce(user_word_progress.xp, 0) + excluded.xp,
        streak = case
          when excluded.streak = 0 then 0
          else coalesce(user_word_progress.streak, 0) + 1
        end,
        updated_at = now()
      `,
      [job.userId, wordIds, deltas, correctFlags],
    );

    await client.query(
      `
      update xp_quiz_events
      set processed = true,
          processed_at = now()
      where user_id = $1
        and attempt_id = $2
      `,
      [job.userId, job.attemptId],
    );

    await client.query("COMMIT");

    return {
      ok: true,
      status: "processed",
      attemptId: job.attemptId,
      processedWords: updates.length,
      messageId: qstashMessageId,
      retried: qstashRetried,
    };
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("XP QUIZ WORKER FAILED", {
      attemptId: job.attemptId,
      userId: job.userId,
      qstashMessageId,
      qstashRetried,
      error,
    });

    throw error;
  } finally {
    client.release();
  }
});