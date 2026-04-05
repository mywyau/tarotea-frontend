import { useRuntimeConfig } from "#imports";
import { Receiver } from "@upstash/qstash";
import { createError, defineEventHandler, getHeader, readRawBody } from "h3";
import { db } from "~/server/repositories/db";

type WorkerJob = {
  attemptId: string;
  userId: string;
};

type RawPayloadAnswer = {
  wordId: string;
  correct: boolean;
};

type QuizEventPayload = {
  version?: number;
  answers?: RawPayloadAnswer[];
};

type QuizEventRow = {
  id: string | number;
  payload: unknown;
  processed: boolean;
  mode: string;
  applied_total_delta: number | string | null;
};

type AggregatedWordUpdate = {
  wordId: string;
  delta: number;
  appliedDelta: number;
  correctCount: number;
  wrongCount: number;
  finalCorrect: boolean;
  finalStreak: number;
};

type ProgressRow = {
  word_id: string;
  streak: number | null;
  xp: number | null;
};

const WRONG_PENALTY = -12;
const STREAK_CAP = 5;

function deltaFor(correct: boolean, streakBefore: number): number {
  if (!correct) return WRONG_PENALTY;

  const effective = Math.min(streakBefore, STREAK_CAP);
  return 5 + effective * 2;
}

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

function parsePayloadAnswers(payload: unknown): RawPayloadAnswer[] {
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

  const answers = (parsedPayload as QuizEventPayload | null)?.answers;

  if (!Array.isArray(answers)) {
    throw createError({
      statusCode: 500,
      statusMessage: "Stored quiz payload is missing answers",
    });
  }

  const normalized: RawPayloadAnswer[] = [];

  for (const item of answers) {
    if (!item || typeof item !== "object") continue;

    const wordId = (item as { wordId?: unknown }).wordId;
    const correct = (item as { correct?: unknown }).correct;

    if (typeof wordId !== "string" || !wordId.trim()) continue;
    if (typeof correct !== "boolean") continue;

    normalized.push({
      wordId: wordId.trim(),
      correct,
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

function buildAggregatedUpdates(
  answers: RawPayloadAnswer[],
  streakMap: Map<string, number>,
  xpMap: Map<string, number>,
): {
  updates: AggregatedWordUpdate[];
  totalDelta: number;
  appliedTotalDelta: number;
  correctCount: number;
  totalQuestions: number;
} {
  const perWord = new Map<string, AggregatedWordUpdate>();

  let totalDelta = 0;
  let appliedTotalDelta = 0;
  let correctCount = 0;

  for (const answer of answers) {
    const current = perWord.get(answer.wordId);

    const streakBefore = current
      ? current.finalStreak
      : (streakMap.get(answer.wordId) ?? 0);

    const xpBefore = current
      ? current.appliedDelta + (xpMap.get(answer.wordId) ?? 0)
      : (xpMap.get(answer.wordId) ?? 0);

    const delta = deltaFor(answer.correct, streakBefore);
    const xpAfter = Math.max(0, xpBefore + delta);
    const appliedDeltaForAnswer = xpAfter - xpBefore;
    const nextStreak = answer.correct ? streakBefore + 1 : 0;

    totalDelta += delta;
    appliedTotalDelta += appliedDeltaForAnswer;

    if (answer.correct) correctCount += 1;

    if (!current) {
      perWord.set(answer.wordId, {
        wordId: answer.wordId,
        delta,
        appliedDelta: appliedDeltaForAnswer,
        correctCount: answer.correct ? 1 : 0,
        wrongCount: answer.correct ? 0 : 1,
        finalCorrect: answer.correct,
        finalStreak: nextStreak,
      });
      continue;
    }

    current.delta += delta;
    current.appliedDelta += appliedDeltaForAnswer;
    current.correctCount += answer.correct ? 1 : 0;
    current.wrongCount += answer.correct ? 0 : 1;
    current.finalCorrect = answer.correct;
    current.finalStreak = nextStreak;
  }

  return {
    updates: [...perWord.values()],
    totalDelta,
    appliedTotalDelta,
    correctCount,
    totalQuestions: answers.length,
  };
}

async function verifyQStashRequest(
  event: Parameters<typeof defineEventHandler>[0],
  rawBody: string,
): Promise<void> {
  const config = useRuntimeConfig(event);

  const currentSigningKey = config.qstashCurrentSigningKey as
    | string
    | undefined;
  const nextSigningKey = config.qstashNextSigningKey as string | undefined;
  const appBaseUrl = config.public.siteUrl as string | undefined;

  if (!currentSigningKey || !nextSigningKey) {
    throw createError({
      statusCode: 500,
      statusMessage: "Missing QStash signing keys",
    });
  }

  if (!appBaseUrl) {
    throw createError({
      statusCode: 500,
      statusMessage: "Missing public.siteUrl",
    });
  }

  const signature = getHeader(event, "Upstash-Signature");

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

  const workerUrl = `${appBaseUrl.replace(/\/+$/, "")}/api/worker/xp-quiz-v5`;

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
  const rawBody = await readRawBody(event, "utf8");

  if (!rawBody) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing request body",
    });
  }

  await verifyQStashRequest(event, rawBody);

  const job = parseWorkerJob(rawBody);
  const qstashMessageId = getHeader(event, "Upstash-Message-Id");
  const qstashRetried = getHeader(event, "Upstash-Retried");

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const eventResult = await client.query<QuizEventRow>(
      `
      select id, payload, processed, mode
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

    const rawAnswers = parsePayloadAnswers(quizEvent.payload);
    const uniqueWordIds = [...new Set(rawAnswers.map((a) => a.wordId))];

    const streakResult = await client.query<ProgressRow>(
      `
        select word_id, streak, xp
        from user_word_progress
        where user_id = $1
          and word_id = any($2::text[])
      `,
      [job.userId, uniqueWordIds],
    );

    const streakMap = new Map<string, number>();
    const xpMap = new Map<string, number>();

    for (const row of streakResult.rows) {
      streakMap.set(row.word_id, Number(row.streak ?? 0));
      xpMap.set(row.word_id, Number(row.xp ?? 0));
    }

    const {
      updates,
      totalDelta,
      appliedTotalDelta,
      correctCount,
      totalQuestions,
    } = buildAggregatedUpdates(rawAnswers, streakMap, xpMap);

    const wordIds = updates.map((u) => u.wordId);
    const deltas = updates.map((u) => u.delta);
    const finalStreaks = updates.map((u) => u.finalStreak);
    const correctCounts = updates.map((u) => u.correctCount);
    const wrongCounts = updates.map((u) => u.wrongCount);
    const finalCorrects = updates.map((u) => u.finalCorrect);

    await client.query(
      `
      update user_word_progress as uwp
      set
        xp = greatest(0, coalesce(uwp.xp, 0) + data.delta),
        streak = data.final_streak,
        correct_count = coalesce(uwp.correct_count, 0) + data.correct_count,
        wrong_count = coalesce(uwp.wrong_count, 0) + data.wrong_count,
        last_seen_at = now(),
        last_correct_at = case
          when data.final_correct then now()
          else uwp.last_correct_at
        end,
        updated_at = now()
      from unnest(
        $2::text[],
        $3::int[],
        $4::int[],
        $5::int[],
        $6::int[],
        $7::boolean[]
      ) as data(
        word_id,
        delta,
        final_streak,
        correct_count,
        wrong_count,
        final_correct
      )
      where uwp.user_id = $1
        and uwp.word_id = data.word_id
      `,
      [
        job.userId,
        wordIds,
        deltas,
        finalStreaks,
        correctCounts,
        wrongCounts,
        finalCorrects,
      ],
    );

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
          created_at,
          updated_at
        )
      select
        $1::text as user_id,
        data.word_id,
        greatest(0, data.delta) as xp,
        data.final_streak,
        data.correct_count,
        data.wrong_count,
        now(),
        case when data.final_correct then now() else null end,
        now(),
        now()
      from unnest(
        $2::text[],
        $3::int[],
        $4::int[],
        $5::int[],
        $6::int[],
        $7::boolean[]
      ) as data(
        word_id,
        delta,
        final_streak,
        correct_count,
        wrong_count,
        final_correct
      )
      on conflict (user_id, word_id) do nothing
      `,
      [
        job.userId,
        wordIds,
        deltas,
        finalStreaks,
        correctCounts,
        wrongCounts,
        finalCorrects,
      ],
    );

    await client.query(
      `
        update xp_quiz_events
        set
          total_delta = $3,
          applied_total_delta = $4,
          correct_count = $5,
          total_questions = $6,
          processed = true,
          processed_at = now()
        where user_id = $1
          and attempt_id = $2
      `,
      [
        job.userId,
        job.attemptId,
        totalDelta,
        appliedTotalDelta,
        correctCount,
        totalQuestions,
      ],
    );

    await client.query("COMMIT");

    return {
      ok: true,
      status: "processed",
      attemptId: job.attemptId,
      processedWords: updates.length,
      totalDelta,
      correctCount,
      totalQuestions,
      messageId: qstashMessageId,
      retried: qstashRetried,
    };
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("XP QUIZ WORKER V5 FAILED", {
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
