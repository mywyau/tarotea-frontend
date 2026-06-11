import { createError, readBody, setHeader } from "h3";
import { db } from "~/server/repositories/db";
import { enforceRateLimit } from "~/server/utils/rate-limiting/rateLimit";
import { requireUser } from "~/server/utils/requireUser";

type ProfileBody = {
  firstName?: unknown;
  lastName?: unknown;
};

type ProfileResponse = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
};

function normalizeName(value: unknown, fieldName: string) {
  if (value == null) return null;

  if (typeof value !== "string") {
    throw createError({
      statusCode: 400,
      statusMessage: `${fieldName} must be text`,
    });
  }

  const trimmed = value.trim().replace(/\s+/g, " ");

  if (!trimmed) return null;

  if (trimmed.length > 80) {
    throw createError({
      statusCode: 400,
      statusMessage: `${fieldName} must be 80 characters or less`,
    });
  }

  return trimmed;
}

export default defineEventHandler(async (event): Promise<ProfileResponse> => {
  setHeader(event, "Cache-Control", "private, no-store");

  const authUser = await requireUser(event);
  const userId = authUser.sub;

  await enforceRateLimit(`rl:account-profile:${userId}`, 60, 60);

  const body = await readBody<ProfileBody>(event);
  const firstName = normalizeName(body?.firstName, "First name");
  const lastName = normalizeName(body?.lastName, "Last name");

  const { rows } = await db.query(
    `
      update users
      set
        first_name = $2,
        last_name = $3
      where id = $1
      returning id, email, first_name, last_name
    `,
    [userId, firstName, lastName],
  );

  const row = rows[0];

  if (!row) {
    throw createError({ statusCode: 404, statusMessage: "User not found" });
  }

  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
  };
});
