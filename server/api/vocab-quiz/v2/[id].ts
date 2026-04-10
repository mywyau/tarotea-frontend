// server/api/vocab-quiz/[id].ts

import { getUserEntitlement } from "#imports";
import { createError, getRouterParam } from "h3";
import { FREE_LEVEL_WORD_LIMIT } from "~/config/level/levels-config";
import { getUnlockedWordIdsForUser } from "~/server/services/cache/wordUnlockCache";
import { requireUser } from "~/server/utils/requireUser";
import { Entitlement } from "~/types/auth/entitlements";
import { isLevelId, levelIdToNumbers } from "~/utils/levels/levels";
import {
  canAccessLevel,
  isComingSoon,
  isFreeLevel,
} from "~/utils/levels/permissions";

type QuizWord = {
  id: string;
  word: string;
  jyutping?: string;
  meaning?: string;
};

type VocabQuizData = {
  id?: string;
  title?: string;
  description?: string;
  categories: Record<string, QuizWord[]>;
};

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");

  console.log("Vocab quiz requested", {
    id,
    timestamp: new Date().toISOString(),
  });

  if (!id) {
    console.warn("Missing vocab quiz id");
    throw createError({ statusCode: 400, statusMessage: "Missing id" });
  }

  if (!isLevelId(id)) {
    throw createError({ statusCode: 404, statusMessage: "Level not found" });
  }

  const levelNumber = levelIdToNumbers(id);

  if (isComingSoon(levelNumber)) {
    throw createError({
      statusCode: 403,
      statusMessage: "Level coming soon",
    });
  }

  const {
    public: { cdnBase },
  } = useRuntimeConfig();

  let quiz: VocabQuizData;

  try {
    quiz = await $fetch<VocabQuizData>(`${cdnBase}/vocab-quiz/${id}.json`);
  } catch {
    console.error("Vocab quiz not found", { id });

    throw createError({
      statusCode: 404,
      statusMessage: "vocab-quiz set not found",
    });
  }

  const allWords = Object.values(quiz.categories).flat();
  const allWordIds = allWords.map((word) => word.id).filter(Boolean);
  const freePreviewIds = allWordIds.slice(0, FREE_LEVEL_WORD_LIMIT);

  // Free levels: return full quiz set
  if (isFreeLevel(levelNumber)) {
    console.log("Vocab quiz served successfully", {
      id,
      totalWords: allWordIds.length,
      accessibleWords: allWordIds.length,
      access: "free-level",
    });

    return quiz;
  }

  let userId: string | null = null;
  let entitlementValue: Entitlement | null = null;

  try {
    const user = await requireUser(event);
    userId = user.sub ?? null;

    console.log("userid: ", userId);

    const entitlement = await getUserEntitlement(userId);
    entitlementValue = entitlement;
  } catch {
    userId = null;
    entitlementValue = null;
  }

  const hasFullAccess = !!userId && canAccessLevel(true, entitlementValue);

  // Paid/full-access users: return full quiz set
  if (hasFullAccess) {
    console.log("Vocab quiz served successfully", {
      id,
      totalWords: allWordIds.length,
      accessibleWords: allWordIds.length,
      access: "full-access",
    });

    return quiz;
  }

  // Free user on paid level:
  // allow preview words + individually unlocked words
  const unlockedWordIds = userId
    ? await getUnlockedWordIdsForUser(userId, allWordIds)
    : [];

  const accessibleWordIds = Array.from(
    new Set([...freePreviewIds, ...unlockedWordIds]),
  );

  const accessibleWordIdSet = new Set(accessibleWordIds);

  const filteredCategories = Object.fromEntries(
    Object.entries(quiz.categories).map(([key, words]) => [
      key,
      words.filter((word) => accessibleWordIdSet.has(word.id)),
    ]),
  );

  console.log("Vocab quiz served successfully", {
    id,
    totalWords: allWordIds.length,
    accessibleWords: accessibleWordIds.length,
    access: userId ? "preview-plus-unlocked" : "preview-only",
  });

  return {
    ...quiz,
    categories: filteredCategories,
  };
});
