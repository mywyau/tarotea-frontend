import { getRequestIP, type H3Event } from "h3";

export function getRateLimitSubject(
  event: H3Event,
  userId: string | null | undefined,
): string {
  const normalizedUserId = userId?.trim();
  if (normalizedUserId) {
    return `user:${normalizedUserId}`;
  }

  const requestIp = getRequestIP(event, { xForwardedFor: true })?.trim();
  return `guest:${requestIp || "unknown"}`;
}
