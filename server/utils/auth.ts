import { verifyAuth0Token } from "@/server/utils/auth0";
import { H3Event, getHeader } from "h3";
import { db } from "~/server/db";

export type SessionUser = {
  id: string; // auth0 sub
  email: string;
  stripeCustomerId?: string | null;
  plan?: string | null;
  subscriptionStatus?: string | null;
  cancelAtPeriodEnd?: boolean | null;
};

export async function getUserFromSession(
  event: H3Event,
): Promise<SessionUser | null> {
  // 1️⃣ Read Authorization header
  const authHeader = getHeader(event, "authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice("Bearer ".length);

  // 2️⃣ Verify Auth0 token
  let payload;
  try {
    payload = await verifyAuth0Token(token);
  } catch {
    return null;
  }

  // 3️⃣ Extract Auth0 user ID
  const auth0UserId = payload.sub;
  if (!auth0UserId) {
    return null;
  }

  // 4️⃣ Load user from DB (MATCHES YOUR SCHEMA)
  const { rows } = await db.query(
    `
    SELECT
      u.id,
      u.email,
      u.stripe_customer_id,
      e.plan,
      e.subscription_status,
      e.cancel_at_period_end
    FROM users u
    LEFT JOIN entitlements e ON e.user_id = u.id
    WHERE u.id = $1
    `,
    [auth0UserId],
  );

  const row = rows[0];
  if (!row) return null;

  return {
    id: row.id,
    email: row.email,
    stripeCustomerId: row.stripe_customer_id,
    plan: row.plan,
    subscriptionStatus: row.subscription_status,
    cancelAtPeriodEnd: row.cancel_at_period_end,
  };
}
