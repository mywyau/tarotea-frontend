/**
 * Builds a stable QStash deduplication ID from persisted identifiers.
 *
 * QStash sends this value as a header, so keep it to a conservative character
 * set. Empty or punctuation-only parts still remain distinguishable.
 */
export function createQstashDeduplicationId(
  prefix: string,
  ...parts: Array<string | number>
): string {
  return [prefix, ...parts]
    .map((part) => String(part).replace(/[^a-zA-Z0-9._-]/g, "_"))
    .join("__");
}
