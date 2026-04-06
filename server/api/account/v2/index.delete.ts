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

  const client = await db.connect();

  let jobId: number | null = null;
  let alreadyInProgress = false;

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

      await client.query("COMMIT");
    }
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  if (!alreadyInProgress && jobId !== null) {
    try {
      await qstash.publishJSON({
        url: `${process.env.SITE_BASE_URL}/api/account/v2/worker-delete`,
        body: {
          jobId,
          userId: user.id,
        },
        deduplicationId: `account-delete:${user.id}`,
      });
    } catch (err) {
      // Queue publish failed after DB commit.
      // Keep the job as pending so it can be retried manually or by a sweeper.
      console.error("Failed to publish account deletion job", {
        userId: user.id,
        jobId,
        error: err,
      });

      throw createError({
        statusCode: 500,
        statusMessage: "Failed to queue account deletion",
      });
    }
  }

  setResponseStatus(event, 202);

  return {
    success: true,
    queued: !alreadyInProgress,
    alreadyInProgress,
    status: "pending",
  };
});