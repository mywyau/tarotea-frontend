<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

setTimeout(() => {
  router.push('/levels')
}, 2500)
</script>

<template>
  <main class="max-w-xl mx-auto py-16 px-4 text-center space-y-6">
    <h1 class="text-3xl font-semibold">🎉 Welcome to Tarotea Pro</h1>
    <p class="text-gray-600">
      Your upgrade was successful. All levels are now unlocked.
    </p>
    <p class="text-sm text-gray-500">
      Redirecting you to your levels…
    </p>
  </main>
</template>
