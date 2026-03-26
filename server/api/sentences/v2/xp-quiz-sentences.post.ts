import { Receiver } from "@upstash/qstash";
import { createError, getHeader, readRawBody } from "h3";
import { SENTENCE_PROGRESS_CACHE_TTL_SECONDS } from "~/config/redis";
import { db } from "~/server/repositories/db";
import { redis } from "~/server/repositories/redis";

type PayloadAnswer = {
  wordId: string;
  correct: boolean;
  delta: number;
};

type SentenceAggregate = {
  wordId: string;
  sentenceId: string;
  seenInc: number;
  correctInc: number;
  wrongInc: number;
};

type WorkerBody = {
  userId: string;
  sessionKey: string;
  mode: string;
  payloadAnswers: PayloadAnswer[];
  sentenceAggregates: SentenceAggregate[];
};

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();

  const rawBody = await readRawBody(event, "utf8");
  if (!rawBody) {
    throw createError({ statusCode: 400, statusMessage: "Missing body" });
  }

  const signature = getHeader(event, "upstash-signature");
  if (!signature) {
    throw createError({ statusCode: 401, statusMessage: "Missing signature" });
  }

  const receiver = new Receiver({
    currentSigningKey: config.qstashCurrentSigningKey,
    nextSigningKey: config.qstashNextSigningKey,
  });

  const isValid = await receiver.verify({
    signature,
    body: rawBody,
    url: `${config.public.siteUrl}/api/worker/xp-quiz-sentences`,
  });

  if (!isValid) {
    throw createError({ statusCode: 401, statusMessage: "Invalid signature" });
  }

  const body = JSON.parse(rawBody) as WorkerBody;
  const { userId, sessionKey, mode, payloadAnswers, sentenceAggregates } = body;

  const existingEventRes = await db.query(
    `
    select mode, total_delta, correct_count, total_questions
    from xp_quiz_events
    where user_id = $1
      and session_key = $2
    limit 1
    `,
    [userId, sessionKey],
  );

  if (existingEventRes.rows.length > 0) {
    const existing = existingEventRes.rows[0];
    return {
      quiz: {
        mode: existing.mode,
        correctCount: Number(existing.correct_count ?? 0),
        totalQuestions: Number(existing.total_questions ?? 0),
        xpEarned: Number(existing.total_delta ?? 0),
      },
    };
  }

  const client = await db.connect();
  await client.query("BEGIN");

  try {
    const correctCount = payloadAnswers.filter((a) => a.correct).length;
    const totalDelta = payloadAnswers.reduce((acc, a) => acc + a.delta, 0);

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

    const existingWordRowsRes = await client.query(
      `
      select word_id
      from user_word_progress
      where user_id = $1
        and word_id = any($2::text[])
      `,
      [userId, payloadAnswers.map((a) => a.wordId)],
    );

    const existingWordIds = new Set<string>(
      existingWordRowsRes.rows.map((row) => row.word_id),
    );

    const answersForExisting = payloadAnswers.filter((a) =>
      existingWordIds.has(a.wordId),
    );

    if (answersForExisting.length > 0) {
      await client.query(
        `
        with aggregated as (
          select *
          from unnest(
            $2::text[],
            $3::boolean[],
            $4::int[]
          ) as t(word_id, correct, delta)
        )
        update user_word_progress uwp
        set
          xp = greatest(0, uwp.xp + aggregated.delta),
          streak = case
            when aggregated.correct then uwp.streak + 1
            else 0
          end,
          updated_at = now()
        from aggregated
        where uwp.user_id = $1
          and uwp.word_id = aggregated.word_id
        `,
        [
          userId,
          answersForExisting.map((a) => a.wordId),
          answersForExisting.map((a) => a.correct),
          answersForExisting.map((a) => a.delta),
        ],
      );
    }

    const answersForMissing = payloadAnswers.filter(
      (a) => !existingWordIds.has(a.wordId),
    );

    if (answersForMissing.length > 0) {
      await client.query(
        `
        insert into user_word_progress (
          user_id,
          word_id,
          xp,
          streak,
          created_at,
          updated_at
        )
        select
          $1,
          t.word_id,
          greatest(0, t.delta),
          case when t.correct then 1 else 0 end,
          now(),
          now()
        from unnest(
          $2::text[],
          $3::boolean[],
          $4::int[]
        ) as t(word_id, correct, delta)
        `,
        [
          userId,
          answersForMissing.map((a) => a.wordId),
          answersForMissing.map((a) => a.correct),
          answersForMissing.map((a) => a.delta),
        ],
      );
    }

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

      const redisWrites: Record<string, string> = {};

      for (const row of sentenceUpsertRes.rows) {
        redisWrites[row.sentence_id] = JSON.stringify({
          seenCount: Number(row.seen_count ?? 0),
          lastSeenAt: row.last_seen_at ?? null,
        });
      }

      if (Object.keys(redisWrites).length > 0) {
        const sentenceProgressKey = `sentence_progress:${userId}`;
        await redis.hset(sentenceProgressKey, redisWrites);
        await redis.expire(
          sentenceProgressKey,
          SENTENCE_PROGRESS_CACHE_TTL_SECONDS,
        );
      }
    }

    await client.query("COMMIT");

    await redis.del(`quiz:sentences:${userId}:${sessionKey}`).catch(() => {});

    return {
      quiz: {
        mode,
        correctCount,
        totalQuestions: payloadAnswers.length,
        xpEarned: totalDelta,
      },
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
});