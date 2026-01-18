export function canAccessLevel(level: number, me: any | null) {
  // Free preview
  if (level <= 2) return true

  // Must be logged in
  if (!me) return false

  // Paid users get everything
  return me.plan === 'pro' && me.active === true
}
