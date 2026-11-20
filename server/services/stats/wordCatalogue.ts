import { FREE_LEVEL_WORD_LIMIT } from "~/config/level/levels-config";
import { FREE_WORD_LIMIT } from "~/config/topic/topics-config";
import { levelSelectMetaData } from "~/utils/levels/helpers";
import { isFreeLevel } from "~/utils/levels/permissions";
import { topics } from "~/utils/topics/topics";
import { isFreeTopic } from "~/utils/topics/permissions";

type WordIndex = { categories: Record<string, { id: string }[]> };

// Catalogue order determines the free preview on the level and topic pages.
export const getStatsWordCatalogue = defineCachedFunction(async (cdnBase: string) => {
  const scopes = [
    ...levelSelectMetaData.filter(level => !level.comingSoon).map(level => ({
      path: `levels/${level.id}`, free: isFreeLevel(level.number), preview: FREE_LEVEL_WORD_LIMIT,
    })),
    ...topics.filter(topic => !topic.comingSoon).map(topic => ({
      path: `topics/${topic.id}`, free: isFreeTopic(topic.id), preview: FREE_WORD_LIMIT,
    })),
  ];
  const all = new Set<string>();
  const unlockable = new Set<string>();
  // Bound concurrent CDN reads on a cold cache. Cache only complete catalogues.
  for (let start = 0; start < scopes.length; start += 6) {
    await Promise.all(scopes.slice(start, start + 6).map(async scope => {
      const index = await $fetch<WordIndex>(`${cdnBase}/${scope.path}.json`, { timeout: 5000, retry: 0 });
      Object.values(index.categories).flat().forEach((word, position) => {
        all.add(word.id);
        if (!scope.free && position >= scope.preview) unlockable.add(word.id);
      });
    }));
  }
  return { all: [...all], unlockable: [...unlockable] };
}, { name: "stats-word-catalogue", maxAge: 60 * 60, swr: true });
