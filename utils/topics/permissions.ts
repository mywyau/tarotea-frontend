import type { Entitlement } from "@/composables/useMeStateV2";

export const freeTopics = new Set([
  "survival-essentials",
  "greetings-polite",
  "fruits-vegetables",
  "clothing",
  "dim-sum",
  "resturant-menu",
]);

export function hasPaidAccess(entitlement: Entitlement | null): boolean {
  if (!entitlement) {
    return false;
  }

  return (
    entitlement.plan !== "free" &&
    ["active", "trialing", "past_due"].includes(entitlement.subscription_status)
  );
}

export function isFreeTopic(topic: string): boolean {
  return freeTopics.has(topic);
}

export function canAccessTopic(
  authReady: boolean,
  isLoggedIn: boolean,
  userEntitlement: Entitlement,
  topic: string,
): boolean {
  if (!authReady) return false;

  isFreeTopic(topic)

  // Paid levels
  if (!isLoggedIn) return false;
  
  return hasPaidAccess(userEntitlement);
}

export function canAccessTopicuQuiz(
  isLoggedIn: boolean,
  userEntitlement: Entitlement | null,
  topic: string,
): boolean {

  if(isFreeTopic(topic)) return true;

  // Paid levels
  if (!isLoggedIn) return false;
  
  return hasPaidAccess(userEntitlement);
}
