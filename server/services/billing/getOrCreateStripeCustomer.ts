import { db } from "~/server/repositories/db";
import { stripe } from "~/server/services/billing/stripeClient";

export async function getOrCreateStripeCustomer(
  userId: string,
  email: string,
): Promise<string> {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const existing = await client.query<{ stripe_customer_id: string | null }>(
      `
        select stripe_customer_id
        from users
        where id = $1
        for update
      `,
      [userId],
    );

    const user = existing.rows[0];

    if (!user) {
      throw new Error(
        `User not found while creating Stripe customer: ${userId}`,
      );
    }

    const existingCustomerId = user.stripe_customer_id;

    if (existingCustomerId) {
      await client.query("COMMIT");
      return existingCustomerId;
    }

    const customer = await stripe.customers.create(
      {
        email,
        metadata: {
          userId,
        },
      },
      {
        idempotencyKey: `customer:${userId}`,
      },
    );

    await client.query(
      `
        update users
        set stripe_customer_id = $1
        where id = $2
      `,
      [customer.id, userId],
    );

    await client.query("COMMIT");
    return customer.id;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
