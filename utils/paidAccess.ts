import type { Entitlement } from "~/types/auth/entitlements";

const PAID_SUBSCRIPTION_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
]);

export function hasPaidAccess(entitlement: Entitlement | null): boolean {
  return Boolean(
    entitlement &&
      entitlement.plan !== "free" &&
      PAID_SUBSCRIPTION_STATUSES.has(entitlement.subscription_status),
  );
}
