export function canAccessLevel(level: number, me: any | null) {
  // Free preview
  if (level <= 1) return true

  // Must be logged in
  if (!me) return false

  // Paid + active users only
  return (
    (me.plan === 'monthly' || me.plan === 'yearly') &&
    me.active === true
  )
}