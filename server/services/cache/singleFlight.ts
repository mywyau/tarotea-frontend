const inflightLoads = new Map<string, Promise<unknown>>();

/**
 * Coalesces concurrent cache misses within a server instance.
 *
 * The entry is always removed after completion so failures can be retried and
 * successful values continue to be governed by the backing cache TTL.
 */
export function runSingleFlight<T>(
  key: string,
  loader: () => Promise<T>,
): Promise<T> {
  const existing = inflightLoads.get(key);
  if (existing) {
    return existing as Promise<T>;
  }

  const pending = Promise.resolve().then(loader).finally(() => {
    if (inflightLoads.get(key) === pending) {
      inflightLoads.delete(key);
    }
  });

  inflightLoads.set(key, pending);
  return pending;
}
