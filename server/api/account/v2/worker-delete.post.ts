import { createError, defineEventHandler, readBody } from "h3";
import Stripe from "stripe";

import { db } from "~/server/repositories/db";
import { deleteAuth0User } from "@/server/utils/auth0";
import { deleteUserData } from "@/server/utils/deleteUserData";

type WorkerBody = {
  jobId: number;
  userId: string;
};

type JobRow = {
  id: number | string;
  user_id: string;
  status: "pending" | "processing" | "failed" | "completed";
  attempt_count: number | string;
};

type UserRow = {
  id: string;
  stripe_customer_id: string | null;
};

export default defineEventHandler(async (event) => {
  const body = await readBody<WorkerBody>(event);

  if (!body?.jobId || !body?.userId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing jobId or userId",
    });
  }

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const claimRes = await client.query<JobRow>(
      `
      UPDATE account_deletion_jobs
      SET status = 'processing',
          attempt_count = attempt_count + 1,
          started_at = NOW(),
          last_error = NULL
      WHERE id = $1
        AND user_id = $2
        AND status IN ('pending', 'failed')
      RETURNING id, user_id, status, attempt_count
      `,
      [body.jobId, body.userId]
    );

    if (claimRes.rowCount === 0) {
      await client.query("ROLLBACK");
      return {
        success: true,
        skipped: true,
      };
    }

    await client.query(
      `
      UPDATE users
      SET deletion_status = 'processing'
      WHERE id = $1
      `,
      [body.userId]
    );

    const userRes = await client.query<UserRow>(
      `
      SELECT id, stripe_customer_id
      FROM users
      WHERE id = $1
      `,
      [body.userId]
    );

    if (userRes.rowCount === 0) {
      throw new Error("User not found");
    }

    const user = userRes.rows[0];

    await client.query("COMMIT");

    // 1. Cancel Stripe
    if (user.stripe_customer_id) {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: "2023-10-16",
      });

      const subs = await stripe.subscriptions.list({
        customer: user.stripe_customer_id,
        status: "all",
        limit: 100,
      });

      for (const sub of subs.data) {
        if (sub.status !== "canceled") {
          try {
            await stripe.subscriptions.cancel(sub.id);
          } catch (err: any) {
            const message = String(err?.message ?? "");
            if (!message.toLowerCase().includes("no such subscription")) {
              throw err;
            }
          }
        }
      }
    }

    // 2. Delete Auth0 first
    await deleteAuth0User(body.userId);

    // 3. Delete app data last
    await deleteUserData(body.userId);

    // 4. Mark job completed
    await db.query(
      `
      UPDATE account_deletion_jobs
      SET status = 'completed',
          completed_at = NOW(),
          last_error = NULL
      WHERE id = $1
      `,
      [body.jobId]
    );

    // Only keep this if users row still exists after deleteUserData
    await db.query(
      `
      UPDATE users
      SET deletion_status = 'completed',
          deleted_at = NOW()
      WHERE id = $1
      `,
      [body.userId]
    );

    return {
      success: true,
      completed: true,
    };
  } catch (err: any) {
    const message = String(err?.message ?? err);

    await db.query(
      `
      UPDATE account_deletion_jobs
      SET status = 'failed',
          last_error = $2
      WHERE id = $1
      `,
      [body.jobId, message]
    );

    await db.query(
      `
      UPDATE users
      SET deletion_status = 'failed'
      WHERE id = $1
      `,
      [body.userId]
    );

    console.error("Account deletion job failed", {
      jobId: body.jobId,
      userId: body.userId,
      error: err,
    });

    throw err;
  } finally {
    client.release();
  }
});