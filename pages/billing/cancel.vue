<script setup lang="ts">
definePageMeta({ layout: 'default' })

function upgrade(billing: 'monthly' | 'yearly') {
  useUpgrade(billing)
}
</script>

<template>
  <main class="min-h-[70vh] flex items-center justify-center px-4">
    <div class="max-w-md w-full text-center space-y-6">

      <div class="text-5xl">😌</div>

      <h1 class="text-2xl font-semibold">
        Payment cancelled
      </h1>

      <p class="text-gray-600">
        No worries! Your payment was cancelled and no charges were made.
      </p>

      <p class="text-sm text-gray-500">
        If you’d like to continue, choose a plan below.
      </p>

      <div class="space-y-3 pt-4">
        <button @click="upgrade('monthly')"
          class="block w-full rounded-lg border border-gray-300 py-3 font-medium transition hover:bg-gray-50">
          Monthly plan · £5.99
        </button>

        <button @click="upgrade('yearly')"
          class="block w-full rounded-lg bg-black text-white py-3 font-medium hover:bg-gray-800 transition">
          Yearly plan · £59.99 · Best value
        </button>
      </div>



      <NuxtLink to="/levels" class="block pt-4 text-sm text-gray-500 hover:underline">
        Continue learning without upgrading
      </NuxtLink>

      <p class="text-sm text-gray-400 pt-4">
        You can safely close this page.
      </p>

    </div>
  </main>
</template>
