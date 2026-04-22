import { countOnlineUsers, touchOnlineSession } from '../utils/onlineUsers'

type CurrentUsersBody = {
  sessionId?: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<CurrentUsersBody>(event)
  const sessionId = body?.sessionId?.trim()

  if (!sessionId) {
    return {
      currentUsers: await countOnlineUsers(),
    }
  }

  return {
    currentUsers: await touchOnlineSession(sessionId),
  }
})
