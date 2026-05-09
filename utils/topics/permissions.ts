import { hasPaidAccess } from "~/utils/paidAccess";
import type { Entitlement } from "~/types/auth/entitlements";

export { hasPaidAccess };

export const freeTopics = new Set([
  "survival-essentials",
]);

export const freeTopicsList = [
  "survival-essentials",
];

export const freeTopicsQuiz = [
  "survival-essentials",
];

export const freeTopicsJyutpingDojo = [
  "survival-essentials",
];


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
  if (isFreeTopic(topic)) return true;
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
