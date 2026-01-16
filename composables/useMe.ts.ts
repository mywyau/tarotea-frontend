export const useMe = async () => {
  const { user } = await useAuth()

  if (!user?.sub) {
    return null
  }

  return await $fetch('/api/me', {
    headers: {
      'x-user-id': user.sub
    }
  })
}
