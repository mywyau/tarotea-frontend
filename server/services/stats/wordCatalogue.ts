import { readLessonJson } from "~/server/services/lessons/storage";
import { FREE_LEVEL_WORD_LIMIT } from "~/config/level/levels-config";
import { FREE_WORD_LIMIT } from "~/config/topic/topics-config";
import { levelSelectMetaData } from "~/utils/levels/helpers";
import { isFreeLevel } from "~/utils/levels/permissions";
import { topics } from "~/utils/topics/topics";
import { isFreeTopic } from "~/utils/topics/permissions";

type WordIndex = { categories: Record<string, { id: string }[]> };

// Catalogue order determines the free preview on the level and topic pages.
export const getStatsWordCatalogue = defineCachedFunction(async () => {
  const scopes = [
    ...levelSelectMetaData.filter(level => !level.comingSoon).map(level => ({
      directory: "levels" as const, id: level.id, wordPath: `/level/${level.id}/word`, free: isFreeLevel(level.number), preview: FREE_LEVEL_WORD_LIMIT,
    })),
    ...topics.filter(topic => !topic.comingSoon).map(topic => ({
      directory: "topics" as const, id: topic.id, wordPath: `/topic/word/${topic.id}`, free: isFreeTopic(topic.id), preview: FREE_WORD_LIMIT,
    })),
  ];
  const all = new Set<string>();
  const unlockable = new Set<string>();
  const previewsByScope: Record<string, string[]> = {};
  const publicWords = new Map<string, string>();
  // Bound concurrent R2 reads on a cold cache. Cache only complete catalogues.
  for (let start = 0; start < scopes.length; start += 6) {
    const batch = scopes.slice(start, start + 6);
    const indexes = await Promise.all(batch.map(scope =>
      readLessonJson<WordIndex>(scope.directory, scope.id)
    ));
    batch.forEach((scope, i) => {
      const index = indexes[i];
      const previews: string[] = [];
      previewsByScope[`${scope.directory}/${scope.id}`] = previews;
      Object.values(index.categories).flat().forEach((word, position) => {
        all.add(word.id);
        if (!scope.free && position >= scope.preview) {
          unlockable.add(word.id);
        } else {
          previews.push(word.id);
          if (publicWords.has(word.id)) return;
          publicWords.set(word.id, `${scope.wordPath}/${encodeURIComponent(word.id)}`);
        }
      });
    });
  }
  return {
    all: [...all],
    unlockable: [...unlockable],
    publicPaths: [...publicWords.values()],
    publicWordIds: [...publicWords.keys()],
    previewsByScope,
  };
}, { name: "published-word-catalogue-v4", maxAge: 60 * 60, swr: false });
