// server/api/echo-lab/access.get.ts
import { getQuery } from "h3"
import { requireUser } from "~/server/utils/requireUser"
import { getEchoLabAccess } from "~/server/utils/whisper/getEchoLabAccess"

export default defineEventHandler(async (event) => {
  const auth = await requireUser(event)
  const query = getQuery(event)
  const wordId = typeof query.wordId === "string" ? query.wordId : undefined

  return getEchoLabAccess(auth.sub, wordId)
})