import { beforeEach, describe, expect, it, vi } from "vitest";

const dbQueryMock = vi.fn();

vi.mock("~/config/unlock/unlock-config", () => ({
  getTaroKeysEarned: (totalXp: number) => Math.floor(totalXp / 100),
}));

vi.mock("~/server/repositories/db", () => ({
  db: { query: dbQueryMock },
}));

const { getUserUnlockBalance } = await import(
  "../server/utils/unlock/getUserUnlockBalance"
);

describe("getUserUnlockBalance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads XP and spent credits in one database query", async () => {
    dbQueryMock.mockResolvedValue({
      rows: [{ total_xp: "250", spent: "2" }],
    });

    const result = await getUserUnlockBalance("user-1");

    expect(dbQueryMock).toHaveBeenCalledOnce();
    expect(dbQueryMock.mock.calls[0][1]).toEqual(["user-1"]);
    expect(result.totalXp).toBe(250);
    expect(result.creditsSpent).toBe(2);
    expect(result.creditsAvailable).toBeGreaterThanOrEqual(0);
  });

  it("returns a zero balance when no aggregate row is available", async () => {
    dbQueryMock.mockResolvedValue({ rows: [] });

    await expect(getUserUnlockBalance("user-1")).resolves.toEqual({
      totalXp: 0,
      creditsEarned: 0,
      creditsSpent: 0,
      creditsAvailable: 0,
    });
  });
});
