// import jwt from "jsonwebtoken"
import { getHeader } from "h3";
import { db } from "~/server/db";
import { requireUser } from "~/server/utils/requireUser";

export async function getAuthenticatedUserFromDB(event: any) {

  const userId = await requireUser(event)
  
  const { rows } = await db.query(
    `
    select
      id,
      email,
      stripe_customer_id as "stripeCustomerId"
    from users
    where id = $1
    `,
    [userId]
  )

  return rows[0] ?? null
}
