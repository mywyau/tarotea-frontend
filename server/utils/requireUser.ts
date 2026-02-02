import { createError, getHeader } from "h3";
import { verifyAuth0Token } from "./auth0";

export async function requireUser(event: any) {
  const authHeader = getHeader(event, "authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw createError({
      statusCode: 401,
      statusMessage: "Missing Authorization header",
    });
  }

  const token = authHeader.slice("Bearer ".length);

  try {
    const payload = await verifyAuth0Token(token);

    console.log("[requireUser.ts][requireUser] ", payload);

    if (!payload.sub) {
      throw createError({
        statusCode: 401,
        statusMessage: "Invalid token (no sub)",
      });
    }

    return payload.sub;
  } catch (err) {
    console.error("JWT verification failed:", err);
    throw createError({
      statusCode: 401,
      statusMessage: "Invalid or expired token",
    });
  }
}
