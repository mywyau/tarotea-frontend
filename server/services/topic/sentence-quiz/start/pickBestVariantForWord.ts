import { shuffleFisherYates } from "~/utils/shuffle";
import { LevelSentenceItem, SentenceProgress } from "./types";

export function pickBestVariantForWord(
  variants: LevelSentenceItem[],
  progressMap: Map<string, SentenceProgress>,
): LevelSentenceItem {
  const randomized = shuffleFisherYates([...variants]);

  const unseen = randomized.filter(
    (variant) => !progressMap.has(variant.sentenceId),
  );

  if (unseen.length > 0) {
    return unseen[0];
  }

  const sortedSeen = randomized.sort((a, b) => {
    const aProgress = progressMap.get(a.sentenceId);
    const bProgress = progressMap.get(b.sentenceId);

    const aSeenCount = aProgress?.seenCount ?? 0;
    const bSeenCount = bProgress?.seenCount ?? 0;

    if (aSeenCount !== bSeenCount) {
      return aSeenCount - bSeenCount;
    }

    const aLastSeenMs = aProgress?.lastSeenAt
      ? new Date(aProgress.lastSeenAt).getTime()
      : 0;

    const bLastSeenMs = bProgress?.lastSeenAt
      ? new Date(bProgress.lastSeenAt).getTime()
      : 0;

    return aLastSeenMs - bLastSeenMs;
  });

  return sortedSeen[0];
}
