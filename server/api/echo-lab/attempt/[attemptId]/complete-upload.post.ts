import {
  createError,
  defineEventHandler,
  getRouterParam,
  type H3Event,
} from "h3";
import { HeadObjectCommand } from "@aws-sdk/client-s3";

import { MAX_AUDIO_BYTES } from "~/config/audio_config";
import { db } from "~/server/repositories/db";
import { requireUser } from "~/server/utils/requireUser";
import { r2BucketName, r2Client } from "~/server/utils/r2";

type EchoLabAttemptStatus =
  | "created"
  | "uploaded"
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "expired";

type EchoLabAttemptRow = {
  attempt_id: string;
  status: EchoLabAttemptStatus;
  word_id: string;
  example_index: number;
  scope: string | null;
  slug: string | null;
  audio_object_key: string;
  expected_chinese: string | null;
  expected_jyutping: string | null;
  created_at: string;
};

type CompleteUploadResponse = {
  attemptId: string;
  status: EchoLabAttemptStatus;
  wordId: string;
  exampleIndex: number;
  scope: string | null;
  slug: string | null;
  audioObjectKey: string;
  expectedChinese: string | null;
  expectedJyutping: string | null;
  createdAt: string;
};

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function toResponse(row: EchoLabAttemptRow): CompleteUploadResponse {
  return {
    attemptId: row.attempt_id,
    status: row.status,
    wordId: row.word_id,
    exampleIndex: row.example_index,
    scope: row.scope,
    slug: row.slug,
    audioObjectKey: row.audio_object_key,
    expectedChinese: row.expected_chinese,
    expectedJyutping: row.expected_jyutping,
    createdAt: row.created_at,
  };
}

async function headR2Object(objectKey: string) {
  try {
    return await r2Client.send(
      new HeadObjectCommand({
        Bucket: r2BucketName,
        Key: objectKey,
      }),
    );
  } catch (err: any) {
    const statusCode = err?.$metadata?.httpStatusCode;

    if (statusCode === 404 || err?.name === "NotFound") {
      throw createError({
        statusCode: 400,
        statusMessage: "Uploaded audio was not found in R2",
      });
    }

    console.error("[echo-lab:complete-upload] R2 head failed", {
      objectKey,
      error: err,
    });

    throw createError({
      statusCode: 500,
      statusMessage: "Failed to verify uploaded audio",
    });
  }
}

const handler = async (event: H3Event): Promise<CompleteUploadResponse> => {
  const auth = await requireUser(event);
  const userId = auth.sub;

  const attemptId = getRouterParam(event, "attemptId");

  if (!attemptId || !isUuid(attemptId)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing or invalid attemptId",
    });
  }

  const attemptResult = await db.query<EchoLabAttemptRow>(
    `
      select
        id as attempt_id,
        status,
        word_id,
        example_index,
        scope,
        slug,
        audio_object_key,
        expected_chinese,
        expected_jyutping,
        created_at
      from echo_lab_attempts
      where id = $1
        and user_id = $2
      limit 1
    `,
    [attemptId, userId],
  );

  const attempt = attemptResult.rows[0];

  if (!attempt) {
    throw createError({
      statusCode: 404,
      statusMessage: "Echo Lab attempt not found",
    });
  }

  /**
   * Make this endpoint idempotent.
   *
   * If the frontend retries after a successful upload completion,
   * returning the existing state is better than failing.
   */
  if (
    attempt.status === "uploaded" ||
    attempt.status === "queued" ||
    attempt.status === "processing" ||
    attempt.status === "completed"
  ) {
    return toResponse(attempt);
  }

  if (attempt.status === "failed" || attempt.status === "expired") {
    throw createError({
      statusCode: 409,
      statusMessage: `Cannot complete upload for ${attempt.status} attempt`,
    });
  }

  if (attempt.status !== "created") {
    throw createError({
      statusCode: 409,
      statusMessage: `Cannot complete upload from status ${attempt.status}`,
    });
  }

  const head = await headR2Object(attempt.audio_object_key);

  const contentLength = head.ContentLength ?? 0;
  const contentType = head.ContentType ?? "";

  if (contentLength <= 0) {
    await db.query(
      `
        update echo_lab_attempts
        set
          status = 'failed',
          error_code = 'empty_audio',
          error_message = 'Uploaded audio file was empty',
          failed_at = now()
        where id = $1
          and user_id = $2
      `,
      [attemptId, userId],
    );

    throw createError({
      statusCode: 400,
      statusMessage: "Uploaded audio file was empty",
    });
  }

  if (contentLength > MAX_AUDIO_BYTES) {
    await db.query(
      `
        update echo_lab_attempts
        set
          status = 'failed',
          error_code = 'audio_too_large',
          error_message = 'Uploaded audio file was too large',
          failed_at = now()
        where id = $1
          and user_id = $2
      `,
      [attemptId, userId],
    );

    throw createError({
      statusCode: 400,
      statusMessage: "Uploaded audio file was too large",
    });
  }

  if (contentType && !contentType.startsWith("audio/")) {
    await db.query(
      `
        update echo_lab_attempts
        set
          status = 'failed',
          error_code = 'invalid_audio_content_type',
          error_message = $3,
          failed_at = now()
        where id = $1
          and user_id = $2
      `,
      [attemptId, userId, `Invalid audio content type: ${contentType}`],
    );

    throw createError({
      statusCode: 400,
      statusMessage: "Uploaded file was not an audio file",
    });
  }

  const updateResult = await db.query<EchoLabAttemptRow>(
    `
      update echo_lab_attempts
      set status = 'uploaded'
      where id = $1
        and user_id = $2
        and status = 'created'
      returning
        id as attempt_id,
        status,
        word_id,
        example_index,
        scope,
        slug,
        audio_object_key,
        expected_chinese,
        expected_jyutping,
        created_at
    `,
    [attemptId, userId],
  );

  const updatedAttempt = updateResult.rows[0];

  if (!updatedAttempt) {
    throw createError({
      statusCode: 409,
      statusMessage: "Echo Lab attempt could not be marked as uploaded",
    });
  }

  return toResponse(updatedAttempt);
};

export default defineEventHandler(handler);