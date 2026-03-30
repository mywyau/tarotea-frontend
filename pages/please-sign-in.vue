<script setup lang="ts">

definePageMeta({
  title: 'Please sign in · TaroTea'
})

</script>


<template>
  <main class="max-w-xl mx-auto px-6 py-20 text-center space-y-10">

    <div class="text-left">
      <BackLink />
    </div>

    <!-- Title -->
    <div class="space-y-4">
      <h1 class="text-3xl font-semibold">Please sign in 🚧</h1>

      <p class="text-gray-600 text-sm max-w-md mx-auto">
        Sign in to view this content and continue your journey.
      </p>
    </div>

    <!-- CTA -->
    <div class="pt-4">
      <button type="button"
        class="inline-block px-8 py-3 rounded-lg font-semibold shadow-md hover:shadow-lg transition hover:-translate-y-0.5"
        style="background-color:#EAB8E4;" @click="login()">
        Sign in / Create account →
      </button>
    </div>

  </main>
</template>