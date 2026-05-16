import { createError, getRequestIP, readBody, type H3Event } from "h3";
import { normalizeOnlineSessionId } from "../utils/onlineSession";
import { countOnlineUsers, touchOnlineSession } from "../utils/onlineUsers";
import { enforceRateLimit } from "../utils/rate-limiting/rateLimit";

const IP_RATE_LIMIT = 120;
const IP_WINDOW_SECONDS = 60;
const SESSION_RATE_LIMIT = 6;
const SESSION_WINDOW_SECONDS = 60;

type CurrentUsersBody = {
  sessionId?: string;
};

function getRateLimitIp(event: H3Event) {
  return getRequestIP(event, { xForwardedFor: true }) ?? "unknown";
}

export default defineEventHandler(async (event) => {
  const requestIp = getRateLimitIp(event);

  await enforceRateLimit(
    `rl:current-users:ip:${requestIp}`,
    IP_RATE_LIMIT,
    IP_WINDOW_SECONDS,
  );

  const body = await readBody<CurrentUsersBody>(event);
  const sessionId = normalizeOnlineSessionId(body?.sessionId);

  if (!body?.sessionId) {
    return {
      currentUsers: await countOnlineUsers(),
    };
  }

  if (!sessionId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid online session id",
    });
  }

  const sessionPrefix = sessionId.slice(0, 8);

  await enforceRateLimit(
    `rl:current-users:session:${sessionPrefix}`,
    SESSION_RATE_LIMIT,
    SESSION_WINDOW_SECONDS,
  );

  return {
    currentUsers: await touchOnlineSession(sessionId),
  };
});
