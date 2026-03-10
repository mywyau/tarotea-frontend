import type { Entitlement } from "@/composables/useMeStateV2";

export const freeTopics = new Set([
  "survival-essentials",
  "greetings-polite",
  "basic-verbs",
  "fruits-vegetables",
  "clothing",
  "dim-sum",
  "restaurant-menu",
  
]);

export const freeTopicsList = [
  "survival-essentials",
  "greetings-polite",
  "basic-verbs",
  "fruits-vegetables",
  "clothing",
  "dim-sum",
  "restaurant-menu",
];

export const freeTopicsQuiz = [
  "survival-essentials",
  "greetings-polite",
  "fruits-vegetables",
  "clothing",
];

export const freeTopicsJyutpingDojo = [
  "survival-essentials",
  "greetings-polite",
  "fruits-vegetables",
  "clothing",
];

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

export function isFreeTopicQuiz(topic: string): boolean {
  return freeTopicsQuiz.includes(topic);
}

export function isFreeTopicsJyutpingDojo(topic: string): boolean {
  return freeTopicsJyutpingDojo.includes(topic);
}

export function canAccessTopic(
  isLoggedIn: boolean,
  userEntitlement: Entitlement | null,
  topic: string,
): boolean {
  isFreeTopic(topic);
  // Paid levels
  if (!isLoggedIn) return false;

  return hasPaidAccess(userEntitlement);
}

export function canAccessTopicWord(
  isLoggedIn: boolean,
  userEntitlement: Entitlement | null,
  topic: string,
): boolean {
  // Paid levels
  if (!isLoggedIn) return false;

  return hasPaidAccess(userEntitlement);
}

export function canAccessTopicQuiz(
  isLoggedIn: boolean,
  userEntitlement: Entitlement | null,
  topic: string,
): boolean {
  if (isFreeTopicQuiz(topic)) return true;
  // Paid levels
  if (!isLoggedIn) return false;

  return hasPaidAccess(userEntitlement);
}
