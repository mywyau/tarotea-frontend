import { beforeEach, expect, it, vi } from "vitest";

const { query, getUserEntitlement, getStatsWordCatalogue } = vi.hoisted(() => ({
  query: vi.fn(),
  getUserEntitlement: vi.fn(),
  getStatsWordCatalogue: vi.fn(),
}));

vi.mock("~/server/repositories/db", () => ({ db: { query } }));
vi.mock("~/server/utils/requireUser", () => ({ requireUser: async () => ({ sub: "learner" }) }));
vi.mock("~/server/utils/getEntitlement", () => ({ getUserEntitlement }));
vi.mock("~/server/services/stats/wordCatalogue", () => ({ getStatsWordCatalogue }));
vi.mock("~/utils/paidAccess", () => import("../utils/paidAccess"));
vi.mock("~/config/xp/helpers", () => import("../config/xp/helpers"));

vi.stubGlobal("defineEventHandler", (handler: unknown) => handler);
vi.stubGlobal("useRuntimeConfig", () => ({ public: { cdnBase: "test" } }));
const { default: getStats } = await import("../server/api/user/stats/v2/index.get");
const event = {} as Parameters<typeof getStats>[0];

beforeEach(() => {
  vi.resetAllMocks();
  getStatsWordCatalogue.mockResolvedValue({ all: ["a", "b", "c"], unlockable: ["b", "c"] });
  query.mockResolvedValueOnce({ rows: [{ total_correct: 8 }] })
    .mockResolvedValueOnce({ rows: [] })
    .mockResolvedValueOnce({ rows: [{ word_id: "b", kind: "unlocked" }, { word_id: "a", kind: "maxed" }] });
});

it.each([
  ["monthly", "active", 3, 3],
  ["yearly", "trialing", 3, 3],
  ["monthly", "past_due", 3, 3],
  ["monthly", "canceled", 1, 2],
  ["free", "active", 1, 2],
])("counts unlocked words for a %s plan with %s status", async (plan, subscription_status, unlocked, total) => {
  getUserEntitlement.mockResolvedValue({ plan, subscription_status });
  expect(await getStats(event)).toMatchObject({
    words_unlocked: unlocked, total_unlockable_words: total, words_maxed: 1, total_correct: 8,
  });
  expect(getUserEntitlement).toHaveBeenCalledWith("learner");
});

it("keeps paid access distinct from individual unlocks when the catalogue is unavailable", async () => {
  getUserEntitlement.mockResolvedValue({ plan: "yearly", subscription_status: "active" });
  getStatsWordCatalogue.mockResolvedValue(null);
  expect(await getStats(event)).toMatchObject({ words_unlocked: null, total_unlockable_words: null, words_maxed: 1 });
});
