import { FREE_LEVELS } from "~/config/level/levels-config";
import { hasPaidAccess } from "~/utils/paidAccess";
import type { Entitlement } from "~/types/auth/entitlements";

export { hasPaidAccess };

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

export function canAccessLevelV2(
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
