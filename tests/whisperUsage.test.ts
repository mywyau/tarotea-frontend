import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.fn();

vi.mock("~/server/repositories/db", () => ({
  db: { query: queryMock },
}));

const {
  consumeWhisperAttemptMonthlyBySubject,
  refundWhisperAttemptMonthlyBySubject,
} = await import(
  "../server/repositories/whisper/consumeWhisperAttemptMonthlyBySubject"
);
const { refundWhisperAttemptSubscriptionMonthV2 } = await import(
  "../server/repositories/whisper/consumeWhisperAttemptSubscriptionMonthV2"
);

describe("consumeWhisperAttemptMonthlyBySubject", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("increments only while the monthly allowance has capacity", async () => {
    queryMock.mockResolvedValue({ rows: [{ attempts: 3 }] });

    await expect(
      consumeWhisperAttemptMonthlyBySubject("device:test", 5),
    ).resolves.toEqual({ attempts: 3, remaining: 2 });

    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining(
        "where ai_usage_monthly_subject.attempts < $2",
      ),
      ["device:test", 5],
    );
  });

  it("rejects without incrementing after the allowance is exhausted", async () => {
    queryMock.mockResolvedValue({ rows: [] });

    await expect(
      consumeWhisperAttemptMonthlyBySubject("device:test", 5),
    ).rejects.toMatchObject({
      statusCode: 429,
      statusMessage: "Monthly pronunciation limit reached",
    });
  });

  it("refunds one consumed attempt without allowing a negative count", async () => {
    queryMock.mockResolvedValue({ rows: [] });

    await refundWhisperAttemptMonthlyBySubject("device:test");

    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("greatest(attempts - 1, 0)"),
      ["device:test"],
    );
  });

  it("refunds the exact subscription allowance window", async () => {
    queryMock.mockResolvedValue({ rows: [] });
    const windowStart = new Date("2026-11-01T00:00:00.000Z");
    const windowEnd = new Date("2026-12-01T00:00:00.000Z");

    await refundWhisperAttemptSubscriptionMonthV2(
      "user-1",
      windowStart,
      windowEnd,
    );

    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("greatest(attempts - 1, 0)"),
      ["user-1", windowStart.toISOString(), windowEnd.toISOString()],
    );
  });
});
