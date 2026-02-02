// export function canAccessLevel(level: number, me: any | null) {
//   // Free preview
//   if (level <= 2) return true

//   // Must be logged in
//   if (!me) return false

//   // Paid + active users only
//   return (
//     (me.plan === 'monthly' || me.plan === 'yearly') &&
//     me.active === true
//   )
// }

import type { MeUser } from "@/composables/useMeStateV2";

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
