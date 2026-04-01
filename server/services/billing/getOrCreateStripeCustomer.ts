import { db } from "~/server/repositories/db";
import { stripe } from "~/server/services/billing/stripeClient";

export async function getOrCreateStripeCustomer(
  userId: string,
  email: string,
): Promise<string> {
  const existing = await db.query<{ stripe_customer_id: string | null }>(
    `
      select stripe_customer_id
      from users
      where id = $1
      limit 1
    `,
    [userId],
  );

  const existingCustomerId = existing.rows[0]?.stripe_customer_id;

  if (existingCustomerId) {
    return existingCustomerId;
  }

  const customer = await stripe.customers.create({
    email,
    metadata: {
      userId,
    },
  });

  await db.query(
    `
      update users
      set stripe_customer_id = $1
      where id = $2
    `,
    [customer.id, userId],
  );

  return customer.id;
}