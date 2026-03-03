import { isLevelId, levelIdToNumbers } from "@/utils/levels/levels";
import { isComingSoon, isFreeLevel } from "~/utils/levels/permissions";

export default defineNuxtRouteMiddleware((to) => {
  const slug = to.params.slug as string | undefined;
  if (!slug) return;

  const { authReady } = useMeStateV2();

  if (!authReady.value) return;

  // ✅ Type guard
  if (!isLevelId(slug)) {
    throw createError({ statusCode: 404 });
  }

  const levelNumber: number = levelIdToNumbers(slug);

  if (isFreeLevel(levelNumber)) {
    return;
  }

  if (isComingSoon(levelNumber)) {
    return navigateTo("/coming-soon");
  }
});
