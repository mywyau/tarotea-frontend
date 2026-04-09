import { FREE_LEVELS } from "~/config/levels-config";
import type { Entitlement } from "~/types/auth/entitlements";

export function hasPaidAccess(entitlement: Entitlement | null): boolean {
  if (!entitlement) {
    return false;
  }

  return (
    entitlement.plan !== "free" &&
    ["active", "trialing", "past_due"].includes(entitlement.subscription_status)
  );
}

export function isFreeLevel(level: number) {
  return level <= FREE_LEVELS;
}

export function isComingSoon(level: number) {
  return level > 10;
}

export function canEnterLevel(entitlement: Entitlement | null): boolean {
  return hasPaidAccess(entitlement);
}

export function canAccessLevel(
  isLoggedIn: boolean,
  userEntitlement: Entitlement | null,
): boolean {
  if (!isLoggedIn) return false;
  return canEnterLevel(userEntitlement);
}

export function canAccessLevelWord(
  levelNumber: number,
  entitlement: Entitlement | null,
): boolean {
  if (isFreeLevel(levelNumber)) return true;
  return hasPaidAccess(entitlement);
}

export function canAccessLevelQuiz(
  levelNumber: number,
  entitlement: Entitlement | null,
): boolean {
  if (isFreeLevel(levelNumber)) return true;
  return hasPaidAccess(entitlement);
}
