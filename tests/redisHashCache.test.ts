import { beforeEach, describe, expect, it, vi } from "vitest";

const multiExecMock = vi.fn();
const multiChain: Record<string, ReturnType<typeof vi.fn>> = {};

multiChain.hset = vi.fn(() => multiChain);
multiChain.hmget = vi.fn(() => multiChain);
multiChain.expire = vi.fn(() => multiChain);
multiChain.exec = multiExecMock;
const redisMultiMock = vi.fn(() => multiChain);

vi.mock("~/server/repositories/redis", () => ({
  redis: {
    multi: redisMultiMock,
  },
}));

const { getHashFieldsAndRefreshExpiry, setHashFieldsWithExpiry } = await import(
  "../server/services/cache/redisHashCache"
);

describe("getHashFieldsAndRefreshExpiry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    multiExecMock.mockResolvedValue([["one", null], 1]);
  });

  it("reads fields and refreshes their expiry in one transaction", async () => {
    const result = await getHashFieldsAndRefreshExpiry(
      "word-progress:user-1",
      ["word-1", "word-2"],
      600,
    );

    expect(result).toEqual(["one", null]);
    expect(redisMultiMock).toHaveBeenCalledOnce();
    expect(multiChain.hmget).toHaveBeenCalledWith(
      "word-progress:user-1",
      "word-1",
      "word-2",
    );
    expect(multiChain.expire).toHaveBeenCalledWith(
      "word-progress:user-1",
      600,
    );
    expect(multiExecMock).toHaveBeenCalledOnce();
  });

  it("rejects invalid read configuration", async () => {
    await expect(getHashFieldsAndRefreshExpiry("cache", [], 600))
      .rejects.toThrow("Invalid Redis hash cache configuration");
  });
});

describe("setHashFieldsWithExpiry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    multiExecMock.mockResolvedValue([1, 1]);
  });

  it("writes fields and their expiry in one transaction", async () => {
    const fields = { "word-1": '{"xp":5}' };

    await setHashFieldsWithExpiry("word-progress:user-1", fields, 600);

    expect(redisMultiMock).toHaveBeenCalledOnce();
    expect(multiChain.hset).toHaveBeenCalledWith(
      "word-progress:user-1",
      fields,
    );
    expect(multiChain.expire).toHaveBeenCalledWith(
      "word-progress:user-1",
      600,
    );
    expect(multiExecMock).toHaveBeenCalledOnce();
  });

  it("skips an empty field set", async () => {
    await setHashFieldsWithExpiry("word-progress:user-1", {}, 600);
    expect(redisMultiMock).not.toHaveBeenCalled();
  });

  it("rejects invalid cache configuration", async () => {
    await expect(setHashFieldsWithExpiry("", { field: "value" }, 600))
      .rejects.toThrow("Invalid Redis hash cache configuration");
    await expect(setHashFieldsWithExpiry("cache", { field: "value" }, 0))
      .rejects.toThrow("Invalid Redis hash cache configuration");
  });
});
