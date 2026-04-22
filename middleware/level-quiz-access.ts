import { isLevelId, levelIdToNumbers } from "@/utils/levels/levels";
import {
  canAccessLevelQuiz,
  isComingSoon,
  isFreeLevel,
} from "~/utils/levels/permissions";

export default defineNuxtRouteMiddleware(async (to) => {
  if (process.server) return; // middleware runs on client only

  const slug = to.params.slug as string;

  if (!slug) return;

  const { isLoggedOut, entitlement, resolve } = useMeStateV2();

  await resolve();

  if (!isLevelId(slug)) {
    throw createError({ statusCode: 404 });
  }

  const levelNumber: number = levelIdToNumbers(slug);
  const isGuestPreviewRoute =
    to.path.includes("/sentences/") ||
    to.path.includes("/word/") ||
    to.path.includes("/audio/");

  if (isLoggedOut.value) {
    if (isGuestPreviewRoute) {
      return;
    }
    return navigateTo("/please-sign-in");
  }

  // // Free levels
  // if (isFreeLevel(levelNumber)) return;

  // Coming soon
  if (isComingSoon(levelNumber)) {
    return navigateTo("/coming-soon");
  }

  return;

  // Full paid access
  // if (canAccessLevelQuiz(levelNumber, entitlement.value)) {
  //   return;
  // }

  // Final fallback
  return navigateTo("/upgrade");
});
