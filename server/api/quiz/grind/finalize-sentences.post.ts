import { createError, getHeader, readBody } from "h3";
import { db } from "~/server/repositories/db";
import { redis } from "~/server/repositories/redis";
import { requireUser } from "~/server/utils/requireUser";

type Answer = { wordId: string; sentenceId?: string; correct: boolean };

type QuizMode =
  | "level-sentences"
  | "topic-sentences"
  | "level-sentences-audio"
  | "topic-sentences-audio";

type FinalizeBody = {
  mode?: QuizMode;
  quizType?: string;
  answers: Answer[];
};

type SentenceAggregate = {
  wordId: string;
  sentenceId: string;
  seenInc: number;
  correctInc: number;
  wrongInc: number;
};

type PayloadAnswer = {
  wordId: string;
  correct: boolean;
  delta: number;
};

const ALLOWED_MODES: QuizMode[] = [
  "level-sentences",
  "topic-sentences",
  "level-sentences-audio",
  "topic-sentences-audio",
];

const WRONG_PENALTY = -12;
const STREAK_CAP = 5;

function deltaFor(
  mode: QuizMode,
  correct: boolean,
  streakBefore: number,
): number {
  if (!correct) return WRONG_PENALTY;

  const effective = Math.min(streakBefore, STREAK_CAP);

  switch (mode) {
    case "level-sentences":
    case "topic-sentences":
    case "level-sentences-audio":
    case "topic-sentences-audio":
      return 10 + effective * 3;
    default:
      return 10 + effective * 3;
  }
}

function aggregateSentenceAnswers(
  answers: Array<Answer & { sentenceId: string }>,
): SentenceAggregate[] {
  const map = new Map<string, SentenceAggregate>();

  for (const a of answers) {
    const existing = map.get(a.sentenceId) ?? {
      wordId: a.wordId,
      sentenceId: a.sentenceId,
      seenInc: 0,
      correctInc: 0,
      wrongInc: 0,
    };

    existing.seenInc += 1;

    if (a.correct) {
      existing.correctInc += 1;
    } else {
      existing.wrongInc += 1;
    }

    map.set(a.sentenceId, existing);
  }

  return [...map.values()];
}

function buildWordOutcomeMap(rawAnswers: Answer[]): Map<string, boolean> {
  const map = new Map<string, boolean>();

  for (const answer of rawAnswers) {
    if (!answer?.wordId) continue;

    if (!map.has(answer.wordId)) {
      map.set(answer.wordId, !!answer.correct);
    }
  }

  return map;
}

function buildPayloadAnswers(
  mode: QuizMode,
  rawAnswers: Answer[],
  streakMap: Map<string, number>,
): PayloadAnswer[] {
  const wordOutcomeMap = buildWordOutcomeMap(rawAnswers);

  return [...wordOutcomeMap.entries()].map(([wordId, correct]) => {
    const streakBefore = streakMap.get(wordId) ?? 0;

    return {
      wordId,
      correct,
      delta: deltaFor(mode, correct, streakBefore),
    };
  });
}

export default defineEventHandler(async (event) => {
  const userId = await requireUser(event);
  const body = (await readBody(event)) as FinalizeBody;

  if (!body || !Array.isArray(body.answers)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid payload" });
  }

  const rawMode = body.mode ?? body.quizType ?? "grind-level";

  if (!ALLOWED_MODES.includes(rawMode as QuizMode)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid quiz mode",
    });
  }

  const mode = rawMode as QuizMode;

  const wordOutcomeMap = buildWordOutcomeMap(body.answers);

  if (wordOutcomeMap.size === 0) {
    throw createError({ statusCode: 400, statusMessage: "No answers" });
  }

  const sentenceAnswers = body.answers.filter(
    (a): a is Answer & { sentenceId: string } =>
      typeof a.sentenceId === "string" && a.sentenceId.length > 0,
  );

  const sentenceAggregates = aggregateSentenceAnswers(sentenceAnswers);

  const client = await db.connect();
  await client.query("BEGIN");

  let sentenceProgressRows: Array<{
    sentence_id: string;
    seen_count: number;
    last_seen_at: string | null;
  }> = [];

  try {
    const streakMap = new Map<string, number>();

    const streakRes = await client.query(
      `
      select word_id, streak
      from user_word_progress
      where user_id = $1 and word_id = any($2::text[])
      `,
      [userId, [...wordOutcomeMap.keys()]],
    );

    for (const r of streakRes.rows) {
      streakMap.set(r.word_id, Number(r.streak ?? 0));
    }

    const payloadAnswers = buildPayloadAnswers(mode, body.answers, streakMap);

    const correctCount = payloadAnswers.filter((a) => a.correct).length;
    const totalDelta = payloadAnswers.reduce((acc, a) => acc + a.delta, 0);

    const sessionKey = `${mode}:${Date.now()}:${userId}`;

    await client.query(
      `
      insert into xp_quiz_events
        (user_id, mode, session_key, payload, total_delta, correct_count, total_questions)
      values
        ($1, $2, $3, $4::jsonb, $5, $6, $7)
      `,
      [
        userId,
        mode,
        sessionKey,
        JSON.stringify({ answers: payloadAnswers }),
        totalDelta,
        correctCount,
        payloadAnswers.length,
      ],
    );

    if (sentenceAggregates.length > 0) {
      const wordIds = sentenceAggregates.map((a) => a.wordId);
      const sentenceIds = sentenceAggregates.map((a) => a.sentenceId);
      const seenIncs = sentenceAggregates.map((a) => a.seenInc);
      const correctIncs = sentenceAggregates.map((a) => a.correctInc);
      const wrongIncs = sentenceAggregates.map((a) => a.wrongInc);

      const sentenceUpsertRes = await client.query(
        `
        with aggregated as (
          select *
          from unnest(
            $2::text[],
            $3::text[],
            $4::int[],
            $5::int[],
            $6::int[]
          ) as t(word_id, sentence_id, seen_inc, correct_inc, wrong_inc)
        )
        insert into user_sentence_progress (
          user_id,
          word_id,
          sentence_id,
          seen_count,
          correct_count,
          wrong_count,
          last_seen_at,
          created_at,
          updated_at
        )
        select
          $1,
          word_id,
          sentence_id,
          seen_inc,
          correct_inc,
          wrong_inc,
          now(),
          now(),
          now()
        from aggregated
        on conflict (user_id, sentence_id)
        do update set
          word_id = excluded.word_id,
          seen_count = user_sentence_progress.seen_count + excluded.seen_count,
          correct_count = user_sentence_progress.correct_count + excluded.correct_count,
          wrong_count = user_sentence_progress.wrong_count + excluded.wrong_count,
          last_seen_at = now(),
          updated_at = now()
        returning sentence_id, seen_count, last_seen_at
        `,
        [userId, wordIds, sentenceIds, seenIncs, correctIncs, wrongIncs],
      );

      sentenceProgressRows = sentenceUpsertRes.rows;
    }

    await client.query("COMMIT");

    if (sentenceProgressRows.length > 0) {
      try {
        const redisWrites: Record<string, string> = {};

        for (const row of sentenceProgressRows) {
          redisWrites[row.sentence_id] = JSON.stringify({
            seenCount: Number(row.seen_count ?? 0),
            lastSeenAt: row.last_seen_at ?? null,
          });
        }

        if (Object.keys(redisWrites).length > 0) {
          await redis.hset(`sentence_progress:${userId}`, redisWrites);
        }
      } catch (redisError) {
        console.error(
          "Failed to refresh sentence progress Redis cache",
          redisError,
        );
      }
    }

    const host =
      getHeader(event, "x-forwarded-host") ?? getHeader(event, "host");
    const proto = getHeader(event, "x-forwarded-proto") ?? "https";

    if (host) {
      fetch(`${proto}://${host}/api/worker/xp-quiz`, {
        method: "POST",
      }).catch(() => {});
    }

    return {
      quiz: {
        mode,
        correctCount,
        totalQuestions: payloadAnswers.length,
        xpEarned: totalDelta,
      },
    };
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("FINALIZE FAILED", {
      mode,
      body,
      error: e,
    });
    throw e;
  } finally {
    client.release();
  }
});
