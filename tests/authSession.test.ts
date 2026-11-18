import { beforeEach, describe, expect, it, vi } from "vitest";

const verifyAuth0TokenMock = vi.fn();
const dbQueryMock = vi.fn();

vi.mock("@/server/utils/auth0", () => ({
  verifyAuth0Token: verifyAuth0TokenMock,
}));

vi.mock("~/server/repositories/db", () => ({
  db: {
    query: dbQueryMock,
  },
}));

const { getUserFromSession } = await import("../server/utils/auth");

function eventWithAuthorization(authorization?: string) {
  return {
    node: {
      req: {
        headers: authorization ? { authorization } : {},
      },
    },
  } as Parameters<typeof getUserFromSession>[0];
}

describe("getUserFromSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null without querying dependencies when no bearer token exists", async () => {
    await expect(getUserFromSession(eventWithAuthorization())).resolves.toBeNull();

    expect(verifyAuth0TokenMock).not.toHaveBeenCalled();
    expect(dbQueryMock).not.toHaveBeenCalled();
  });

  it("returns the user and complete entitlement from one database query", async () => {
    verifyAuth0TokenMock.mockResolvedValue({ sub: "user-1" });
    dbQueryMock.mockResolvedValue({
      rows: [
        {
          id: "user-1",
          email: "learner@example.com",
          stripe_customer_id: "cus_1",
          deleting_at: null,
          plan: "monthly",
          subscription_status: "active",
          cancel_at_period_end: false,
          current_period_start: "2026-11-01T00:00:00.000Z",
          current_period_end: "2026-12-01T00:00:00.000Z",
          canceled_at: null,
        },
      ],
    });

    await expect(
      getUserFromSession(eventWithAuthorization("Bearer access-token")),
    ).resolves.toMatchObject({
      id: "user-1",
      email: "learner@example.com",
      entitlement: {
        plan: "monthly",
        subscription_status: "active",
        cancel_at_period_end: false,
        current_period_start: "2026-11-01T00:00:00.000Z",
        current_period_end: "2026-12-01T00:00:00.000Z",
      },
    });

    expect(dbQueryMock).toHaveBeenCalledOnce();
    expect(dbQueryMock).toHaveBeenCalledWith(
      expect.stringContaining("e.current_period_end"),
      ["user-1"],
    );
  });
});
