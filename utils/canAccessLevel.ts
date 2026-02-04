import type { Entitlement, MeUser } from "@/composables/useMeStateV2";

export function hasPaidAccess(entitlement: Entitlement) {
  return entitlement.subscription_status === 'active'
      || entitlement.subscription_status === 'trialing'
      || entitlement.subscription_status === 'past_due'
}


export function isFreeLevel(level: number) {
  return level <= 2;
}

export function canAccessLevel(level: number, entitlement: Entitlement): boolean {
  // if (isFreeLevel(level)) return true;
  if (!entitlement) return false;
  return hasPaidAccess(entitlement);
}
