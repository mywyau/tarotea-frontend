import {
  createError,
  defineEventHandler,
  getRouterParam,
  type H3Event,
} from "h3";

import { db } from "~/server/repositories/db";
import { requireUser } from "~/server/utils/requireUser";

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
  queued_at: string | null;
};

type QueueAttemptResponse = {
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
  queuedAt: string | null;
};

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function toResponse(row: EchoLabAttemptRow): QueueAttemptResponse {
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
    queuedAt: row.queued_at,
  };
}

async function getAttemptForUser(
  attemptId: string,
  userId: string,
): Promise<EchoLabAttemptRow | null> {
  const result = await db.query<EchoLabAttemptRow>(
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
        created_at,
        queued_at
      from echo_lab_attempts
      where id = $1
        and user_id = $2
      limit 1
    `,
    [attemptId, userId],
  );

  return result.rows[0] ?? null;
}

const handler = async (event: H3Event): Promise<QueueAttemptResponse> => {
  const auth = await requireUser(event);
  const userId = auth.sub;

  const attemptId = getRouterParam(event, "attemptId");

  if (!attemptId || !isUuid(attemptId)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing or invalid attemptId",
    });
  }

  const attempt = await getAttemptForUser(attemptId, userId);

  if (!attempt) {
    throw createError({
      statusCode: 404,
      statusMessage: "Echo Lab attempt not found",
    });
  }

  /**
   * Make queueing idempotent.
   * If the frontend retries, don't create a problem.
   */
  if (
    attempt.status === "queued" ||
    attempt.status === "processing" ||
    attempt.status === "completed"
  ) {
    return toResponse(attempt);
  }

  if (attempt.status === "created") {
    throw createError({
      statusCode: 409,
      statusMessage: "Cannot queue attempt before upload is completed",
    });
  }

  if (attempt.status === "failed" || attempt.status === "expired") {
    throw createError({
      statusCode: 409,
      statusMessage: `Cannot queue ${attempt.status} attempt`,
    });
  }

  if (attempt.status !== "uploaded") {
    throw createError({
      statusCode: 409,
      statusMessage: `Cannot queue attempt from status ${attempt.status}`,
    });
  }

  /**
   * For now this only marks the attempt as queued.
   *
   * Later, this is where we will also send a message to SQS / queue system.
   */
  const updateResult = await db.query<EchoLabAttemptRow>(
    `
      update echo_lab_attempts
      set
        status = 'queued',
        queued_at = now()
      where id = $1
        and user_id = $2
        and status = 'uploaded'
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
        created_at,
        queued_at
    `,
    [attemptId, userId],
  );

  const queuedAttempt = updateResult.rows[0];

  if (!queuedAttempt) {
    throw createError({
      statusCode: 409,
      statusMessage: "Echo Lab attempt could not be queued",
    });
  }

  return toResponse(queuedAttempt);
};

export default defineEventHandler(handler);