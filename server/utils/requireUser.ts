import { createError, getHeader } from "h3";
import { verifyAuth0Token } from "./auth0";

type AuthUser = {
  sub: string;
  email?: string;
  email_verified?: boolean;
};

export async function requireUser(event: any): Promise<AuthUser> {
  const authHeader = getHeader(event, "authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw createError({
      statusCode: 401,
      statusMessage: "Missing Authorization header",
    });
  }

  const token = authHeader.slice("Bearer ".length);

  if (!token || token === "undefined" || !token.includes(".")) {
    throw createError({
      statusCode: 401,
      statusMessage: "Malformed token",
    });
  }

  try {
    const payload = await verifyAuth0Token(token);

    if (!payload?.sub) {
      throw createError({
        statusCode: 401,
        statusMessage: "Invalid token (no sub)",
      });
    }

    return {
      sub: payload.sub,
      email: payload.email,
      email_verified: payload.email_verified,
    };
  } catch (err) {
    console.error("JWT verification failed:", err);
    throw createError({
      statusCode: 401,
      statusMessage: "Invalid or expired token",
    });
  }
}