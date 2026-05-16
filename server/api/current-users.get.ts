import { getRequestIP } from "h3";
import { countOnlineUsers } from "../utils/onlineUsers";
import { enforceRateLimit } from "../utils/rate-limiting/rateLimit";

const IP_RATE_LIMIT = 240;
const IP_WINDOW_SECONDS = 60;

export default defineEventHandler(async (event) => {
  const requestIp = getRequestIP(event, { xForwardedFor: true }) ?? "unknown";

  await enforceRateLimit(
    `rl:current-users:get:ip:${requestIp}`,
    IP_RATE_LIMIT,
    IP_WINDOW_SECONDS,
  );

  return {
    currentUsers: await countOnlineUsers(),
  };
});
