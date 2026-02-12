import type { Entitlement } from "@/composables/useMeStateV2";

export function hasPaidAccess(entitlement: Entitlement) {
  return (
    entitlement.plan !== "free" &&
    (entitlement.subscription_status === "active" ||
      entitlement.subscription_status === "trialing" ||
      entitlement.subscription_status === "past_due")
  );
}

export function isFreeLevel(level: number) {
  return level <= 2;
}

export function canAccessLevel(entitlement: Entitlement): boolean {
  if (!entitlement) return false;
  return hasPaidAccess(entitlement);
}
