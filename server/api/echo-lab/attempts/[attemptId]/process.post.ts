import {
  createError,
  defineEventHandler,
  getRouterParam,
  setHeader,
  type H3Event,
} from "h3";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import OpenAI from "openai";

import { db } from "~/server/repositories/db";
import { redactIdentifier } from "~/server/utils/logging/redact";
import { requireUser } from "~/server/utils/requireUser";
import { r2BucketName, r2Client } from "~/server/utils/r2";
import {
  classifyUpstreamFailure,
  summarizeUpstreamFailure,
} from "~/server/utils/upstreamFailure";
import {
  averageLogprob,
  buildResult,
} from "~/server/utils/whisper/helpers";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 20_000,
  maxRetries: 1,
});

type EchoLabAttemptRow = {
  attempt_id: string;
  user_id: string;
  status: string;
  word_id: string;
  example_index: number;
  scope: string | null;
  slug: string | null;
  audio_object_key: string;
  expected_chinese: string;
  expected_jyutping: string;
};

type ProcessAttemptResponse = {
  attemptId: string;
  status: string;
  transcript: string;
  score: number;
  matchType: string;
  confidence: number;
  feedback: unknown;
};

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

async function streamToBuffer(stream: unknown): Promise<Buffer> {
  if (!stream || typeof stream !== "object") {
    throw new Error("Missing R2 object body");
  }

  const chunks: Buffer[] = [];

  for await (const chunk of stream as AsyncIterable<Uint8Array>) {
    chunks.push(Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

async function getQueuedAttemptForUser(
  attemptId: string,
  userId: string,
): Promise<EchoLabAttemptRow> {
  const result = await db.query<EchoLabAttemptRow>(
    `
      select
        id as attempt_id,
        user_id,
        status,
        word_id,
        example_index,
        scope,
        slug,
        audio_object_key,
        expected_chinese,
        expected_jyutping
      from echo_lab_attempts
      where id = $1
        and user_id = $2
      limit 1
    `,
    [attemptId, userId],
  );

  const attempt = result.rows[0];

  if (!attempt) {
    throw createError({
      statusCode: 404,
      statusMessage: "Echo Lab attempt not found",
    });
  }

  if (attempt.status === "completed") {
    throw createError({
      statusCode: 409,
      statusMessage: "Echo Lab attempt has already been completed",
    });
  }

  if (attempt.status !== "queued") {
    throw createError({
      statusCode: 409,
      statusMessage: `Cannot process attempt from status ${attempt.status}`,
    });
  }

  if (!attempt.expected_chinese || !attempt.expected_jyutping) {
    throw createError({
      statusCode: 400,
      statusMessage: "Attempt is missing expected target data",
    });
  }

  return attempt;
}

async function markProcessing(
  attemptId: string,
  userId: string,
): Promise<boolean> {
  const result = await db.query(
    `
      update echo_lab_attempts
      set
        status = 'processing',
        processing_at = now()
      where id = $1
        and user_id = $2
        and status = 'queued'
    `,
    [attemptId, userId],
  );

  return result.rowCount === 1;
}

async function markFailed(
  attemptId: string,
  userId: string,
  errorCode: string,
  errorMessage: string,
): Promise<void> {
  await db.query(
    `
      update echo_lab_attempts
      set
        status = 'failed',
        error_code = $3,
        error_message = $4,
        failed_at = now()
      where id = $1
        and user_id = $2
    `,
    [attemptId, userId, errorCode, errorMessage],
  );
}

async function returnToQueue(
  attemptId: string,
  userId: string,
  errorCode: string,
): Promise<void> {
  await db.query(
    `
      update echo_lab_attempts
      set
        status = 'queued',
        processing_at = null,
        failed_at = null,
        error_code = $3,
        error_message = 'Temporary provider failure; safe to retry'
      where id = $1
        and user_id = $2
        and status = 'processing'
    `,
    [attemptId, userId, errorCode],
  );
}

const handler = async (event: H3Event): Promise<ProcessAttemptResponse> => {
  const auth = await requireUser(event);
  const userId = auth.sub;

  const attemptId = getRouterParam(event, "attemptId");

  if (!attemptId || !isUuid(attemptId)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing or invalid attemptId",
    });
  }

  const attempt = await getQueuedAttemptForUser(attemptId, userId);

  const claimed = await markProcessing(attemptId, userId);

  if (!claimed) {
    throw createError({
      statusCode: 409,
      statusMessage: "Echo Lab attempt could not be claimed for processing",
    });
  }

  try {
    const r2Object = await r2Client.send(
      new GetObjectCommand({
        Bucket: r2BucketName,
        Key: attempt.audio_object_key,
      }),
    );

    const audioBuffer = await streamToBuffer(r2Object.Body);

    if (audioBuffer.length <= 0) {
      throw createError({
        statusCode: 400,
        statusMessage: "Downloaded audio was empty",
      });
    }

    const contentType = r2Object.ContentType || "audio/webm";

    const transcription = await openai.audio.transcriptions.create({
      file: new File([audioBuffer], "recording.webm", {
        type: contentType,
      }),
      model: "gpt-4o-mini-transcribe",
      language: "zh",
      temperature: 0,
      response_format: "json",
      include: ["logprobs"],
      prompt: `
        Do not normalize toward any expected answer.
        Transcribe exactly what was spoken.
        If the speech is Mandarin, return pinyin with tone numbers.
        If the speech is Cantonese, return Chinese characters only.
        If the speech is English, return English.
      `,
    });

    const transcript = transcription.text ?? "";
    const avgLogprob = averageLogprob(transcription.logprobs);

    const result = buildResult({
      expectedChinese: attempt.expected_chinese,
      expectedJyutping: attempt.expected_jyutping,
      transcript,
      avgLogprob,
    });

    await db.query(
      `
        update echo_lab_attempts
        set
          status = 'completed',
          transcript = $3,
          score = $4,
          match_type = $5,
          confidence = $6,
          feedback_json = $7::jsonb,
          completed_at = now()
        where id = $1
          and user_id = $2
      `,
      [
        attemptId,
        userId,
        transcript,
        result.score,
        result.matchType,
        result.confidence,
        JSON.stringify({
          feedback: result.feedback,
          avgLogprob,
        }),
      ],
    );

    return {
      attemptId,
      status: "completed",
      transcript,
      score: result.score,
      matchType: result.matchType,
      confidence: result.confidence,
      feedback: result.feedback,
    };
  } catch (err: unknown) {
    const isHttpError = err && typeof err === "object" && "statusCode" in err;
    const failure = classifyUpstreamFailure(err);

    console.error(
      JSON.stringify({
        event: "echo_lab_processing_failure",
        attemptHash: redactIdentifier(attemptId),
        retryable: !isHttpError && failure.retryable,
        ...summarizeUpstreamFailure(err),
        timestamp: new Date().toISOString(),
      }),
    );

    if (!isHttpError && failure.retryable) {
      await returnToQueue(attemptId, userId, failure.code);
      setHeader(event, "Retry-After", String(failure.retryAfterSeconds));
      throw createError({
        statusCode: 503,
        statusMessage: "Echo Lab processing temporarily unavailable",
      });
    }

    const httpError = isHttpError
      ? (err as { statusCode?: number; statusMessage?: string })
      : undefined;

    await markFailed(
      attemptId,
      userId,
      httpError?.statusCode ? "processing_error" : "unexpected_processing_error",
      httpError?.statusMessage || "Failed to process Echo Lab attempt",
    );

    if (isHttpError) {
      throw err;
    }

    throw createError({
      statusCode: 500,
      statusMessage: "Failed to process Echo Lab attempt",
    });
  }
};

export default defineEventHandler(handler);
