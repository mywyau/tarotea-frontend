import {
  assertMethod,
  createError,
  defineEventHandler,
  readBody,
  setResponseStatus,
} from "h3";
import { Client as QStashClient } from "@upstash/qstash";

import { db } from "~/server/repositories/db";
import { getUserFromSession } from "@/server/utils/auth";

type DeleteBody = {
  confirm?: string;
};

const qstash = new QStashClient({
  token: process.env.QSTASH_TOKEN!,
});

export default defineEventHandler(async (event) => {
  assertMethod(event, "DELETE");

  const user = await getUserFromSession(event);

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthenticated",
    });
  }

  const body = await readBody<DeleteBody>(event);

  if (body?.confirm?.trim().toLowerCase() !== "delete") {
    throw createError({
      statusCode: 400,
      statusMessage: "Confirmation text did not match",
    });
  }

  const siteUrl = process.env.SITE_URL;
  if (!siteUrl) {
    throw createError({
      statusCode: 500,
      statusMessage: "SITE_URL is not configured",
    });
  }

  const workerUrl = `${siteUrl}/api/account/v2/worker-delete`;

  const client = await db.connect();

  let jobId: number | null = null;
  let alreadyInProgress = false;
  let createdNewJob = false;

  try {
    await client.query("BEGIN");

    const lockRes = await client.query(
      `
      UPDATE users
      SET deleting_at = NOW(),
          deletion_requested_at = NOW(),
          deletion_status = 'pending'
      WHERE id = $1
        AND deleting_at IS NULL
        AND deleted_at IS NULL
      RETURNING id
      `,
      [user.id]
    );

    if (lockRes.rowCount === 0) {
      alreadyInProgress = true;

      const existingJobRes = await client.query(
        `
        SELECT id, status
        FROM account_deletion_jobs
        WHERE user_id = $1
          AND status IN ('pending', 'failed')
        ORDER BY created_at DESC
        LIMIT 1
        `,
        [user.id]
      );

      if (existingJobRes.rowCount > 0) {
        jobId = Number(existingJobRes.rows[0].id);
      } else {
        const repairJobRes = await client.query(
          `
          INSERT INTO account_deletion_jobs (
            user_id,
            status,
            attempt_count,
            created_at
          )
          VALUES ($1, 'pending', 0, NOW())
          RETURNING id
          `,
          [user.id]
        );

        jobId = Number(repairJobRes.rows[0].id);
        createdNewJob = true;
      }

      await client.query("COMMIT");
    } else {
      const jobRes = await client.query(
        `
        INSERT INTO account_deletion_jobs (
          user_id,
          status,
          attempt_count,
          created_at
        )
        VALUES ($1, 'pending', 0, NOW())
        RETURNING id
        `,
        [user.id]
      );

      jobId = Number(jobRes.rows[0].id);
      createdNewJob = true;

      await client.query("COMMIT");
    }
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  if (jobId !== null) {
    try {
      const publishResult = await qstash.publishJSON({
        url: workerUrl,
        body: {
          jobId,
          userId: user.id,
        },
        deduplicationId: `account_delete_${jobId}`
      });

      console.log("Published account deletion job", {
        userId: user.id,
        jobId,
        workerUrl,
        createdNewJob,
        alreadyInProgress,
        publishResult,
      });
    } catch (err) {
      console.error("Failed to publish account deletion job", {
        userId: user.id,
        jobId,
        workerUrl,
        error: err,
      });

      throw createError({
        statusCode: 500,
        statusMessage: "Failed to queue account deletion",
      });
    }
  } else {
    throw createError({
      statusCode: 500,
      statusMessage: "No deletion job could be created or found",
    });
  }

  setResponseStatus(event, 202);

  return {
    success: true,
    queued: true,
    alreadyInProgress,
    createdNewJob,
    jobId,
    status: "pending",
  };
});