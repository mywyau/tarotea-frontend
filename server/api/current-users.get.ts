import { countOnlineUsers } from '../utils/onlineUsers'

export default defineEventHandler(async () => {
  return {
    currentUsers: countOnlineUsers(),
  }
})
