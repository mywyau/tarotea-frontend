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

export function hasPaidAccess(me: any | null) {

  if (!me) return false

  return (
    (me.plan === 'monthly' || me.plan === 'yearly') &&
    me.active === true
  )
}

export function isFreeLevel(level: number) {
  return level <= 2
}

export function canAccessLevel(level: number, me: any | null) {
  return isFreeLevel(level) || hasPaidAccess(me)
}