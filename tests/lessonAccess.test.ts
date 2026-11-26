import { beforeEach, expect, it, vi } from "vitest";
import { createError, getQuery, getRouterParam, type H3Event } from "h3";

const { catalogue, entitlement, query, verify, readObject, sign } = vi.hoisted(() => ({
  catalogue: vi.fn(), entitlement: vi.fn(), query: vi.fn(), verify: vi.fn(),
  readObject: vi.fn(), sign: vi.fn(),
}));
vi.mock("~/server/services/stats/wordCatalogue", () => ({ getStatsWordCatalogue: catalogue }));
vi.mock("~/server/utils/getEntitlement", () => ({ getUserEntitlement: entitlement }));
vi.mock("~/server/repositories/db", () => ({ db: { query } }));
vi.mock("~/server/utils/requireUser", () => ({ requireUser: verify }));
vi.mock("~/utils/paidAccess", () => import("../utils/paidAccess"));
vi.mock("~/utils/wordOfTheDay", () => import("../utils/wordOfTheDay"));
vi.mock("~/server/services/lessons/access", () => import("../server/services/lessons/access"));
vi.mock("~/server/services/lessons/storage", () => ({
  readLessonJson: readObject, signLessonRecording: sign, contentSlug: (id: string) => id,
}));
vi.mock("../server/services/lessons/storage", () => ({ readLessonJson: readObject, contentSlug: (id: string) => id }));
vi.stubGlobal("defineEventHandler", (handler: unknown) => handler);
vi.stubGlobal("useRuntimeConfig", () => ({ public: { cdnBase: "catalogue" } }));
vi.stubGlobal("getRouterParam", getRouterParam);
vi.stubGlobal("getQuery", getQuery);
vi.stubGlobal("createError", createError);

vi.mock("~/config/level/levels-config", () => import("../config/level/levels-config"));
vi.mock("~/config/topic/topics-config", () => import("../config/topic/topics-config"));
vi.mock("~/utils/levels/helpers", () => import("../utils/levels/helpers"));
vi.mock("~/utils/levels/permissions", () => import("../utils/levels/permissions"));
vi.mock("~/utils/topics/topics", () => import("../utils/topics/topics"));
vi.mock("~/utils/topics/permissions", () => import("../utils/topics/permissions"));
vi.stubGlobal("defineCachedFunction", (handler: unknown) => handler);

const { default: word } = await import("../server/api/words/[id]");
const { default: dailyWord } = await import("../server/api/daily/jyutping/v2/words/[id].get");
const { default: recording } = await import("../server/api/lesson-audio/[voice]/[file].get");
const { readSentenceFeed } = await import("../server/services/lessons/sentences");

function request(account?: string, id = "locked", url = "/") {
  return {
    node: { req: { url, headers: account ? { authorization: "Bearer " + account } : {} } },
    context: { params: { id, voice: "audio-female", file: id + "-example-1.mp3" } },
  } as unknown as H3Event;
}

beforeEach(() => {
  vi.resetAllMocks();
  catalogue.mockResolvedValue({
    all: ["preview", "locked", "other"], publicWordIds: ["preview"],
    previewsByScope: { "levels/course": ["preview"] },
  });
  verify.mockImplementation(async event => {
    const sub = event.node.req.headers.authorization.slice(7);
    if (sub === "invalid") throw createError({ statusCode: 401 });
    return { sub };
  });
  entitlement.mockImplementation(async sub => sub === "subscriber"
    ? { plan: "monthly", subscription_status: "active" } : null);
  query.mockImplementation(async (_sql, [sub, ids]) => ({
    rows: sub === "buyer" && ids.includes("locked") ? [{ word_id: "locked" }] : [],
  }));
  readObject.mockResolvedValue({ usage: ["lesson notes"] });
  sign.mockResolvedValue("signed-recording");
});

it.each([word, dailyWord])("checks the account before reading a full word record", async handler => {
  for (const [account, status] of [[undefined, 401], ["invalid", 401], ["has-unused-key", 403]] as const) {
    await expect(handler(request(account))).rejects.toMatchObject({ statusCode: status });
  }
  expect(readObject).not.toHaveBeenCalled();
  for (const account of ["buyer", "subscriber"]) {
    expect(await handler(request(account))).toEqual({ usage: ["lesson notes"] });
  }
  await expect(handler(request("different-account"))).rejects.toMatchObject({ statusCode: 403 });
  await expect(handler(request("buyer", "other"))).rejects.toMatchObject({ statusCode: 403 });
});

it("serves a published preview anonymously and rejects unknown words even for subscribers", async () => {
  await word(request(undefined, "preview"));
  expect(readObject).toHaveBeenCalledOnce();
  expect(entitlement).not.toHaveBeenCalled();
  await expect(word(request("subscriber", "unknown"))).rejects.toMatchObject({ statusCode: 404 });
  expect(readObject).toHaveBeenCalledOnce();
});

it("filters raw sentence feeds and their counts using the same user's purchases", async () => {
  const items = ["preview", "locked", "other"].map(sourceWordId => ({ sourceWordId }));
  readObject.mockResolvedValue({ level: 2, title: "Course", items });
  expect(await readSentenceFeed(request(undefined, "course"), "sentences"))
    .toMatchObject({ items: items.slice(0, 1), totalSentences: 1, totalWords: 1 });
  expect(await readSentenceFeed(request("buyer", "course"), "sentences"))
    .toMatchObject({ items: items.slice(0, 2), totalSentences: 2 });
});

it("signs an example recording only after authorizing its source word", async () => {
  await expect(recording(request(undefined, "locked", "/?featured=1"))).rejects.toMatchObject({ statusCode: 401 });
  await expect(recording(request("other-account"))).rejects.toMatchObject({ statusCode: 403 });
  expect(sign).not.toHaveBeenCalled();
  expect(await recording(request("buyer"))).toEqual({ url: "signed-recording" });
  expect(sign).toHaveBeenCalledWith("audio-female", "locked-example-1.mp3");
});

it("fails closed when purchase verification is unavailable", async () => {
  query.mockRejectedValue(new Error("Database unavailable"));
  await expect(word(request("buyer"))).rejects.toThrow("Database unavailable");
  expect(readObject).not.toHaveBeenCalled();
});

it("keeps all free level and topic lessons and only the first five previews per paid scope", async () => {
  const { getStatsWordCatalogue } = await import("../server/services/stats/wordCatalogue");
  readObject.mockImplementation(async (_directory: string, scope: string) => {
    return { categories: { words: Array.from({ length: 7 }, (_, i) => ({ id: scope + "-" + i })) } };
  });
  const actual = await getStatsWordCatalogue();
  expect(actual.previewsByScope["levels/level-one"]).toHaveLength(7);
  expect(actual.previewsByScope["topics/survival-essentials"]).toHaveLength(7);
  expect(actual.previewsByScope["levels/level-eight"]).toHaveLength(5);
  expect(actual.publicWordIds).toContain("level-eight-4");
  expect(actual.publicWordIds).not.toContain("level-eight-5");
});
