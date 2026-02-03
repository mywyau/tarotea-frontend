import type { MeUser } from "@/composables/useMeStateV2";

// export function hasPaidAccess(entitlement) {
//   return entitlement.subscription_status === 'active'
//       || entitlement.subscription_status === 'trialing'
//       || entitlement.subscription_status === 'past_due'
// }


export function hasPaidAccess(user: MeUser): boolean {
  return (
    (user.plan === "monthly" || user.plan === "yearly") && user.active === true
  );
}

export function isFreeLevel(level: number) {
  return level <= 2;
}

export function canAccessLevel(level: number, user: MeUser | null): boolean {
  if (isFreeLevel(level)) return true;
  if (!user) return false;
  return hasPaidAccess(user);
}
