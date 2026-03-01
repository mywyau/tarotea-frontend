export function canAccessLevel(
  authReady: boolean,
  levelNumber: number,
  isLoggedIn: boolean,
  userEntitlement: Entitlement,
): boolean {
  if (!authReady) return false;

  if (levelNumber <= 3) return true;

  // Paid levels
  if (!isLoggedIn) return false;

  return canAccessLevel(userEntitlement!);
}
