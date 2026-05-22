import { createError, defineEventHandler, readBody, type H3Event } from "h3";

import { db } from "~/server/repositories/db";
import { createEchoLabUploadUrl } from "~/server/utils/r2";
import { requireUser } from "~/server/utils/requireUser";
import { getEchoLabAccess } from "~/server/utils/whisper/getEchoLabAccess";

type EchoLabScope = "word" | "level" | "topic";

type CreateEchoLabAttemptBody = {
  wordId?: unknown;
  exampleIndex?: unknown;
  scope?: unknown;
  slug?: unknown;
};

type ParsedCreateEchoLabAttemptBody = {
  wordId: string;
  exampleIndex: number;
  scope: EchoLabScope;
  slug?: string;
};

type EchoLabAttemptResponse = {
  attemptId: string;
  status: string;
  wordId: string;
  exampleIndex: number;
  scope: string | null;
  slug: string | null;
  audioObjectKey: string;
  uploadUrl: string;
  uploadContentType: string;
  expectedChinese: string | null;
  expectedJyutping: string | null;
  createdAt: string;
};

type EchoLabAttemptRow = {
  attempt_id: string;
  status: string;
  word_id: string;
  example_index: number;
  scope: string | null;
  slug: string | null;
  audio_object_key: string;
  expected_chinese: string | null;
  expected_jyutping: string | null;
  created_at: string;
};

function parseCreateAttemptBody(
  body: CreateEchoLabAttemptBody,
): ParsedCreateEchoLabAttemptBody {
  const wordId = typeof body.wordId === "string" ? body.wordId.trim() : "";

  const exampleIndex =
    typeof body.exampleIndex === "number"
      ? body.exampleIndex
      : Number.parseInt(String(body.exampleIndex ?? ""), 10);

  const scope: EchoLabScope =
    body.scope === "level" || body.scope === "topic" || body.scope === "word"
      ? body.scope
      : "word";

  const slug =
    typeof body.slug === "string" && body.slug.trim().length > 0
      ? body.slug.trim()
      : undefined;

  if (!wordId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing wordId",
    });
  }

  if (!Number.isInteger(exampleIndex) || exampleIndex < 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing or invalid exampleIndex",
    });
  }

  if ((scope === "level" || scope === "topic") && !slug) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing slug for Echo Lab attempt",
    });
  }

  return {
    wordId,
    exampleIndex,
    scope,
    slug,
  };
}

function toAttemptResponse(
  row: EchoLabAttemptRow,
  uploadUrl: string,
  uploadContentType: string,
): EchoLabAttemptResponse {
  return {
    attemptId: row.attempt_id,
    status: row.status,
    wordId: row.word_id,
    exampleIndex: row.example_index,
    scope: row.scope,
    slug: row.slug,
    audioObjectKey: row.audio_object_key,
    uploadUrl,
    uploadContentType,
    expectedChinese: row.expected_chinese,
    expectedJyutping: row.expected_jyutping,
    createdAt: row.created_at,
  };
}

const handler = async (event: H3Event): Promise<EchoLabAttemptResponse> => {
  const auth = await requireUser(event);
  const userId = auth.sub;

  const body = await readBody<CreateEchoLabAttemptBody>(event);

  const { wordId, exampleIndex, scope, slug } = parseCreateAttemptBody(body);

  const accessScope = scope === "word" ? undefined : scope;

  const access = await getEchoLabAccess(userId, {
    wordId,
    scope: accessScope,
    slug,
  });

  if (!access.allowed) {
    throw createError({
      statusCode: 403,
      statusMessage:
        access.reason === "needs_more_xp"
          ? `Earn ${Math.max(access.minXp - access.totalXp, 0)} more XP to unlock Echo Lab`
          : access.reason === "needs_more_unlocks"
            ? `Unlock ${Math.max(
                access.minUnlockedWords - access.unlockedWordCount,
                0,
              )} more words to use Echo Lab`
            : "Unlock this word before using Echo Lab",
    });
  }

  const {
    public: { cdnBase },
  } = useRuntimeConfig();

  const word = await $fetch<any>(
    `${cdnBase}/words/${encodeURIComponent(wordId)}.json`,
  );

  const example = word?.examples?.[exampleIndex];

  if (!example?.sentence || !example?.jyutping) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid pronunciation target example",
    });
  }

  const expectedChinese = example.sentence;
  const expectedJyutping = example.jyutping;

  const attemptId = crypto.randomUUID();

  const subjectKey = [scope, slug ?? "none", wordId, exampleIndex].join(":");

  const audioObjectKey = `echo-lab/${userId}/${attemptId}.webm`;

  const result = await db.query<EchoLabAttemptRow>(
    `
      insert into echo_lab_attempts (
        id,
        user_id,
        subject_key,
        status,
        word_id,
        example_index,
        scope,
        slug,
        audio_object_key,
        expected_chinese,
        expected_jyutping,
        created_at
      )
      values (
        $1,
        $2,
        $3,
        'created',
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        $10,
        now()
      )
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
    [
      attemptId,
      userId,
      subjectKey,
      wordId,
      exampleIndex,
      scope,
      slug ?? null,
      audioObjectKey,
      expectedChinese,
      expectedJyutping,
    ],
  );

  const createdAttempt = result.rows[0];

  if (!createdAttempt) {
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to create Echo Lab attempt",
    });
  }

  // return toAttemptResponse(createdAttempt);
  const uploadContentType = "audio/webm";

  const uploadUrl = await createEchoLabUploadUrl({
    objectKey: createdAttempt.audio_object_key,
    contentType: uploadContentType,
  });

  return toAttemptResponse(createdAttempt, uploadUrl, uploadContentType);
};

export default defineEventHandler(handler);
