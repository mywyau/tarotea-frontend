import { beforeEach, describe, expect, it, vi } from "vitest";

const dbQueryMock = vi.fn();
const redisGetMock = vi.fn();
const redisSmismemberMock = vi.fn();
const multiExecMock = vi.fn();
const multiChain: Record<string, ReturnType<typeof vi.fn>> = {};

multiChain.sadd = vi.fn(() => multiChain);
multiChain.expire = vi.fn(() => multiChain);
multiChain.set = vi.fn(() => multiChain);
multiChain.exec = multiExecMock;
const redisMultiMock = vi.fn(() => multiChain);

vi.mock("~/server/repositories/db", () => ({
  db: {
    query: dbQueryMock,
  },
}));

vi.mock("~/server/repositories/redis", () => ({
  redis: {
    get: redisGetMock,
    multi: redisMultiMock,
    smismember: redisSmismemberMock,
  },
}));

const { addWordUnlockToCache, getUnlockedWordIdsForUser, unlockHydratedKey, unlockSetKey } = await import(
  "../server/services/cache/wordUnlockCache"
);

describe("word unlock cache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    redisGetMock.mockResolvedValue("1");
    multiExecMock.mockResolvedValue([1, 1, "OK"]);
  });

  it("checks all requested words with one Redis membership command", async () => {
    redisSmismemberMock.mockResolvedValue([1, 0, 1]);

    await expect(
      getUnlockedWordIdsForUser("user-1", [
        " word-1 ",
        "word-2",
        "word-1",
        "word-3",
      ]),
    ).resolves.toEqual(["word-1", "word-3"]);

    expect(redisSmismemberMock).toHaveBeenCalledOnce();
    expect(redisSmismemberMock).toHaveBeenCalledWith(unlockSetKey("user-1"), [
      "word-1",
      "word-2",
      "word-3",
    ]);
  });

  it("does not call Redis for an empty word list", async () => {
    await expect(
      getUnlockedWordIdsForUser("user-1", ["", "   "]),
    ).resolves.toEqual([]);

    expect(redisGetMock).not.toHaveBeenCalled();
    expect(redisSmismemberMock).not.toHaveBeenCalled();
    expect(dbQueryMock).not.toHaveBeenCalled();
  });

  it("updates an unlock set and its expiry in one transaction", async () => {
    await addWordUnlockToCache("user-1", " word-1 ");

    expect(redisMultiMock).toHaveBeenCalledOnce();
    expect(multiChain.sadd).toHaveBeenCalledWith(
      unlockSetKey("user-1"),
      "word-1",
    );
    expect(multiChain.expire).toHaveBeenCalledWith(
      unlockSetKey("user-1"),
      60 * 60 * 24 * 7,
    );
    expect(multiChain.set).toHaveBeenCalledWith(
      unlockHydratedKey("user-1"),
      "1",
      { ex: 60 * 60 * 24 * 7 },
    );
    expect(multiExecMock).toHaveBeenCalledOnce();
  });
});
