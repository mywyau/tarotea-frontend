export type UpstreamFailure = {
  retryable: boolean;
  code: "upstream_rate_limited" | "upstream_unavailable" | "upstream_failure";
  providerStatus?: number;
  retryAfterSeconds?: number;
};

function numericStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;

  const value = (error as { status?: unknown }).status;
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function stringField(error: unknown, field: "name" | "code"): string {
  if (!error || typeof error !== "object") return "";
  const value = (error as Record<string, unknown>)[field];
  return typeof value === "string" ? value.toLowerCase() : "";
}

export function classifyUpstreamFailure(error: unknown): UpstreamFailure {
  const providerStatus = numericStatus(error);

  if (providerStatus === 429) {
    return {
      retryable: true,
      code: "upstream_rate_limited",
      providerStatus,
      retryAfterSeconds: 30,
    };
  }

  if (providerStatus !== undefined && providerStatus >= 500) {
    return {
      retryable: true,
      code: "upstream_unavailable",
      providerStatus,
      retryAfterSeconds: 15,
    };
  }

  const name = stringField(error, "name");
  const code = stringField(error, "code");
  const temporaryTransportFailure =
    name.includes("timeout") ||
    name.includes("connection") ||
    code === "econnreset" ||
    code === "econnrefused" ||
    code === "etimedout" ||
    code === "enotfound";

  if (temporaryTransportFailure) {
    return {
      retryable: true,
      code: "upstream_unavailable",
      retryAfterSeconds: 15,
    };
  }

  return {
    retryable: false,
    code: "upstream_failure",
    providerStatus,
  };
}

export function summarizeUpstreamFailure(error: unknown) {
  const failure = classifyUpstreamFailure(error);

  return {
    ...failure,
    errorName:
      error instanceof Error ? error.name : stringField(error, "name") || "unknown",
    providerCode: stringField(error, "code") || undefined,
  };
}
