// server/api/_test/delete-auth0.ts
import { deleteAuth0User } from '@/server/utils/auth0'

export default defineEventHandler(async () => {
  await deleteAuth0User('google-oauth2|115481780172182428557')
  return { ok: true }
})
