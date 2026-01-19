<script setup lang="ts">
definePageMeta({ ssr: false })

import { onMounted } from 'vue'

const route = useRoute()
const router = useRouter()

const error = route.query.error
const description = route.query.error_description

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
  <main class="max-w-xl mx-auto py-16 px-4 text-center space-y-4">
    <h1 class="text-2xl font-semibold">
      Sign-in unavailable
    </h1>

    <p class="text-gray-600">
      {{ description || 'This application is currently private.' }}
    </p>

    <NuxtLink to="/" class="inline-block mt-4 text-blue-600 hover:underline">
      Return to home
    </NuxtLink>
  </main>
</template>
