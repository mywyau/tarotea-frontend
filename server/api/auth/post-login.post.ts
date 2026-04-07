import { createError, readBody } from "h3";
import { db } from "~/server/repositories/db";
import { enforceRateLimit } from "~/server/utils/rate-limiting/rateLimit";
import { requireUser } from "~/server/utils/requireUser";

type PostLoginBody = {
  email?: string;
};

export default defineEventHandler(async (event) => {
  const authUser = await requireUser(event);
  const userId = authUser.sub;

  await enforceRateLimit(`rl:post-login:${userId}`, 10, 60);

  const body = await readBody<PostLoginBody>(event);
  const email = authUser.email ?? body?.email;

  if (!userId || !email) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing user identity",
    });
  }

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `
      insert into users (id, email)
      values ($1, $2)
      on conflict (id)
      do update set email = excluded.email
      `,
      [userId, email],
    );

    await client.query(
      `
      insert into entitlements (user_id, plan, subscription_status)
      values ($1, 'free', 'no_subscription')
      on conflict (user_id) do nothing
      `,
      [userId],
    );

    const { rows } = await client.query(
      `
      select
        u.id,
        u.email,
        e.plan,
        e.subscription_status
      from users u
      join entitlements e on e.user_id = u.id
      where u.id = $1
      `,
      [userId],
    );

    if (rows.length === 0) {
      throw new Error("User creation failed");
    }

    await client.query("COMMIT");
    return rows[0];
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[post-login]", err);

    throw createError({
      statusCode: 500,
      statusMessage: "Failed to process login",
    });
  } finally {
    client.release();
  }
});
