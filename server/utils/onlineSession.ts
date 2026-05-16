const ONLINE_SESSION_ID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function normalizeOnlineSessionId(sessionId: unknown) {
  if (typeof sessionId !== "string") {
    return null;
  }

  const trimmed = sessionId.trim();

  if (!ONLINE_SESSION_ID_REGEX.test(trimmed)) {
    return null;
  }

  return trimmed.toLowerCase();
}
