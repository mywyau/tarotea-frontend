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
  transcript: string | null;
  expected_chinese: string | null;
  expected_jyutping: string | null;
  score: number | null;
  match_type: string | null;
  confidence: string | number | null;
  feedback_json: unknown | null;
  error_code: string | null;
  error_message: string | null;
  created_at: string;
  queued_at: string | null;
  processing_at: string | null;
  completed_at: string | null;
  failed_at: string | null;
};

type EchoLabAttemptStatusResponse = {
  attemptId: string;
  status: EchoLabAttemptStatus;
  wordId: string;
  exampleIndex: number;
  scope: string | null;
  slug: string | null;
  audioObjectKey: string;
  transcript: string | null;
  expectedChinese: string | null;
  expectedJyutping: string | null;
  score: number | null;
  matchType: string | null;
  confidence: number | null;
  feedback: unknown | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
  queuedAt: string | null;
  processingAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
};

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function toResponse(row: EchoLabAttemptRow): EchoLabAttemptStatusResponse {
  return {
    attemptId: row.attempt_id,
    status: row.status,
    wordId: row.word_id,
    exampleIndex: row.example_index,
    scope: row.scope,
    slug: row.slug,
    audioObjectKey: row.audio_object_key,
    transcript: row.transcript,
    expectedChinese: row.expected_chinese,
    expectedJyutping: row.expected_jyutping,
    score: row.score,
    matchType: row.match_type,
    confidence: row.confidence === null ? null : Number(row.confidence),
    feedback: row.feedback_json,
    errorCode: row.error_code,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    queuedAt: row.queued_at,
    processingAt: row.processing_at,
    completedAt: row.completed_at,
    failedAt: row.failed_at,
  };
}

const handler = async (
  event: H3Event,
): Promise<EchoLabAttemptStatusResponse> => {
  const auth = await requireUser(event);
  const userId = auth.sub;

  const attemptId = getRouterParam(event, "attemptId");

  if (!attemptId || !isUuid(attemptId)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing or invalid attemptId",
    });
  }

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
        transcript,
        expected_chinese,
        expected_jyutping,
        score,
        match_type,
        confidence,
        feedback_json,
        error_code,
        error_message,
        created_at,
        queued_at,
        processing_at,
        completed_at,
        failed_at
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

  return toResponse(attempt);
};

export default defineEventHandler(handler);