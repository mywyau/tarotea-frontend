import { describe, expect, it, vi } from "vitest";
import { runSingleFlight } from "../server/services/cache/singleFlight";

describe("runSingleFlight", () => {
  it("shares one loader call across concurrent requests", async () => {
    let resolveLoad!: (value: string) => void;
    const loader = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          resolveLoad = resolve;
        }),
    );

    const first = runSingleFlight("topic:v1", loader);
    const second = runSingleFlight("topic:v1", loader);

    await Promise.resolve();
    expect(loader).toHaveBeenCalledOnce();
    resolveLoad("loaded");
    await expect(Promise.all([first, second])).resolves.toEqual([
      "loaded",
      "loaded",
    ]);
  });

  it("removes failed loads so a later request can retry", async () => {
    const loader = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error("temporary failure"))
      .mockResolvedValueOnce("recovered");

    await expect(runSingleFlight("retry:v1", loader)).rejects.toThrow(
      "temporary failure",
    );
    await expect(runSingleFlight("retry:v1", loader)).resolves.toBe(
      "recovered",
    );
    expect(loader).toHaveBeenCalledTimes(2);
  });
});
