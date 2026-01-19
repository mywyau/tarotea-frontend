<script setup lang="ts">
definePageMeta({ ssr: false })

import { onMounted } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useMeState } from '@/composables/useMeState'

const route = useRoute()
const router = useRouter()

const { refresh } = useMeState()

const error = route.query.error as string | undefined
const description = route.query.error_description as string | undefined

onMounted(async () => {
  // ❌ Auth0 denied access (private beta, etc.)
  if (error) {
    console.warn('Auth0 login error:', error, description)
    return
  }

  const { client } = await useAuth()

  if (!client) {
    console.error('Auth0 client not initialised')
    return
  }

  try {
    // Complete Auth0 login
    await client.handleRedirectCallback()

    // Optional: ensure user exists in DB
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

    // ✅ THIS IS THE MISSING PIECE
    await refresh()

    await router.replace('/')
  } catch (e) {
    console.error('Login callback failed:', e)
  }
})
</script>

<template>
  <main class="max-w-xl mx-auto py-16 px-4 text-center space-y-4">
    <!-- ❌ LOGIN ERROR -->
    <template v-if="error">
      <h1 class="text-2xl font-semibold">
        Sign-in unavailable
      </h1>

      <p class="text-gray-600">
        {{ description || 'This application is currently private.' }}
      </p>

      <NuxtLink to="/" class="inline-block mt-4 text-blue-600 hover:underline">
        Return to home
      </NuxtLink>
    </template>

    <!-- ⏳ LOGIN SUCCESS -->
    <template v-else>
      <p class="text-gray-500">
        Signing you in…
      </p>
    </template>
  </main>
</template>
