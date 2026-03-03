import { canAccessTopicQuiz, freeTopics } from "~/utils/topics/permissions";

export default defineNuxtRouteMiddleware(async (to) => {
  if (process.server) return; // middleware runs on client only

  const topic = to.params.topic as string;
  if (!topic) return;

  const { authReady, isLoggedIn, resolve, entitlement } = useMeStateV2();

  await resolve();

  // ✅ Free topics always allowed
  if (freeTopics.has(topic)) {
    return;
  }

  // Full paid access
  if (canAccessTopicQuiz(isLoggedIn.value, entitlement.value, topic)) {
    return;
  }

  return navigateTo("/upgrade");
});
