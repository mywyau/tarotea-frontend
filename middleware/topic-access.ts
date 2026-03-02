import { canAccessTopic, freeTopics } from "~/utils/topics/permissions";

export default defineNuxtRouteMiddleware(async (to) => {
  const topic = to.params.topic as string | undefined;
  if (!topic) return;

  const { authReady, isLoggedIn, resolve, entitlement } = useMeStateV2();

  if (!authReady.value) return;

  if (!entitlement.value) {
    return;
  }

  // ✅ Free topics always allowed
  if (freeTopics.has(topic)) {
    return;
  }

  if (
    !canAccessTopic(authReady.value, isLoggedIn.value, entitlement.value, topic)
  ) {
    return navigateTo("/upgrade");
  }
});
