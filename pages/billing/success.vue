<script setup lang="ts">
definePageMeta({
  layout: 'default'
})

// Optional: read Stripe params if you want later
const route = useRoute()
const sessionId = route.query.session_id as string | undefined
</script>

<template>
  <main class="min-h-[70vh] flex items-center justify-center px-4">
    <div class="max-w-md w-full text-center space-y-6">
      
      <div class="text-5xl">🎉</div>

      <h1 class="text-2xl font-semibold">
        Payment successful
      </h1>

      <p class="text-gray-600">
        Thank you! Your payment has been received and your access is now active.
      </p>

      <div class="space-y-3 pt-4">
        <NuxtLink
          to="/levels"
          class="block w-full rounded-lg bg-black text-white py-3 font-medium hover:bg-gray-800 transition"
        >
          Continue learning
        </NuxtLink>

        <NuxtLink
          to="/account"
          class="block text-sm text-gray-500 hover:underline"
        >
          View account
        </NuxtLink>
      </div>

      <p class="text-xs text-gray-400 pt-4">
        You can safely close this page.
      </p>

    </div>
  </main>
</template>
