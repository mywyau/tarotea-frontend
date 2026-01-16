<script setup lang="ts">
definePageMeta({ ssr: false })

import { onMounted } from 'vue'

const router = useRouter()

onMounted(async () => {
  const { client } = await useAuth()

  if (!client) {
    console.error('Auth0 client not initialised')
    return
  }

  await client.handleRedirectCallback()

  const user = await client.getUser()

  if (user?.sub && user?.email) {
    await $fetch('/api/auth/post-login', {
      method: 'POST',
      body: {
        sub: user.sub,
        email: user.email
      }
    })
  }

  router.push('/')
})
</script>

<template>
  <p>Signing you in…</p>
</template>
