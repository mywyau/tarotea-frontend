const ONLINE_WINDOW_MS = 2 * 60 * 1000

type OnlineUsersState = {
  sessions: Map<string, number>
}

function getState(): OnlineUsersState {
  const globalKey = '__online_users_state__'
  const globalWithState = globalThis as typeof globalThis & {
    [globalKey]?: OnlineUsersState
  }

  if (!globalWithState[globalKey]) {
    globalWithState[globalKey] = {
      sessions: new Map<string, number>(),
    }
  }

  return globalWithState[globalKey]!
}

export function touchOnlineSession(sessionId: string) {
  if (!sessionId) {
    return 0
  }

  const state = getState()
  state.sessions.set(sessionId, Date.now())

  return countOnlineUsers()
}

export function countOnlineUsers() {
  const state = getState()
  const cutoff = Date.now() - ONLINE_WINDOW_MS

  for (const [sessionId, lastSeen] of state.sessions.entries()) {
    if (lastSeen < cutoff) {
      state.sessions.delete(sessionId)
    }
  }

  return state.sessions.size
}
