import { defineEventHandler, getHeader, getRequestURL } from "h3";
import { redactIdentifier, summarizeUserAgent } from "~/server/utils/logging/redact";

const SENSITIVE_PATH_PREFIXES = [
  "/api/auth",
  "/api/stripe",
  "/api/account",
  "/api/billing",
  "/api/worker",
];

const TRAFFIC_SAMPLE_RATE = 0.02;

function shouldSkipPath(pathname: string): boolean {
  return (
    pathname.startsWith("/_nuxt") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/icons") ||
    pathname.startsWith("/robots.txt") ||
    pathname.startsWith("/sitemap")
  );
}

function isSensitivePath(pathname: string): boolean {
  return SENSITIVE_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export default defineEventHandler((event) => {
  const startedAt = Date.now();
  const url = getRequestURL(event);

  if (shouldSkipPath(url.pathname)) {
    return;
  }

  event.node.res.on("finish", () => {
    const statusCode = event.node.res.statusCode || 200;
    const durationMs = Date.now() - startedAt;
    const method = event.node.req.method || "GET";
    const requestId = getHeader(event, "x-request-id") || null;
    const userAgent = getHeader(event, "user-agent") || "";
    const referrer = getHeader(event, "referer") || null;
    const forwardedFor = getHeader(event, "x-forwarded-for") || null;

    const sensitivePath = isSensitivePath(url.pathname);
    const isError = statusCode >= 400;
    const isSlow = durationMs >= 2500;
    const sampled = Math.random() < TRAFFIC_SAMPLE_RATE;

    if (!isError && !sensitivePath && !isSlow && !sampled) {
      return;
    }

    console.log(
      JSON.stringify({
        event: "request_telemetry",
        method,
        path: url.pathname,
        statusCode,
        durationMs,
        requestId,
        sensitivePath,
        isSlow,
        ipHash: redactIdentifier(forwardedFor),
        referrerHash: redactIdentifier(referrer),
        userAgentSummary: summarizeUserAgent(userAgent),
        timestamp: new Date().toISOString(),
      }),
    );
  });
});
