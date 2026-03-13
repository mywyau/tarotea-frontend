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
