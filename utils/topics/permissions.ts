import type { Entitlement } from "@/composables/useMeStateV2";

export const freeTopics = new Set([
  "survival-essentials",
  "greetings-polite",
  "fruits-vegetables",
  "clothing",
  "dim-sum",
  "resturant-menu",
]);

export function hasPaidAccess(entitlement: Entitlement) {
  return (
    entitlement.plan !== "free" &&
    (entitlement.subscription_status === "active" ||
      entitlement.subscription_status === "trialing" ||
      entitlement.subscription_status === "past_due")
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
  
  return hasPaidAccess(userEntitlement!);
}
