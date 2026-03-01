import { levelIdToNumbers, isLevelId } from "@/utils/levels/levels";

export default defineNuxtRouteMiddleware((to) => {
  const slug = to.params.slug as string | undefined;
  if (!slug) return;

  const { authReady } = useMeStateV2();

  if (!authReady.value) return;

  // ✅ Type guard
  if (!isLevelId(slug)) {
    throw createError({ statusCode: 404 });
  }

  const levelNumber = levelIdToNumbers(slug);

  // ✅ Free levels
  if (levelNumber <= 3) return;

  // 🚧 Coming soon
  if (levelNumber > 11) {
    return navigateTo("/coming-soon");
  }

  // 🔒 Paid logic here
});