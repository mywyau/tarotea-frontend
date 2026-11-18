import { describe, expect, it, vi } from "vitest";
import type { PoolClient } from "pg";
import { instrumentPoolClient } from "../server/repositories/instrumentedPool";

describe("instrumentPoolClient", () => {
  it("records promise query failures without changing the rejection", async () => {
    const failure = Object.assign(new Error("private database detail"), {
      code: "23505",
    });
    const query = vi.fn().mockRejectedValue(failure);
    const record = vi.fn();
    const client = instrumentPoolClient(
      { query } as unknown as PoolClient,
      record,
    );

    await expect(client.query("select 1")).rejects.toBe(failure);
    expect(record).toHaveBeenCalledOnce();
    expect(record).toHaveBeenCalledWith(failure);
  });

  it("records callback query failures and preserves callback arguments", () => {
    const failure = new Error("query failed");
    const query = vi.fn(
      (_text: unknown, callback: (error: Error, result?: unknown) => void) => {
        callback(failure, undefined);
      },
    );
    const record = vi.fn();
    const callback = vi.fn();
    const client = instrumentPoolClient(
      { query } as unknown as PoolClient,
      record,
    );

    client.query("select 1", callback);

    expect(record).toHaveBeenCalledWith(failure);
    expect(callback).toHaveBeenCalledWith(failure, undefined);
  });

  it("does not record successful queries", async () => {
    const result = { rows: [{ value: 1 }] };
    const query = vi.fn().mockResolvedValue(result);
    const record = vi.fn();
    const client = instrumentPoolClient(
      { query } as unknown as PoolClient,
      record,
    );

    await expect(client.query("select 1")).resolves.toBe(result);
    expect(record).not.toHaveBeenCalled();
  });
});
