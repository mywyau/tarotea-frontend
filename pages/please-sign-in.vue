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
    <div class="space-y-8">
      <h1 class="text-3xl font-semibold">Please sign in 🚧</h1>

      <p class="text-gray-600 text-sm max-w-md mx-auto">
        Sign in to view this content and continue your journey.
      </p>


    </div>

    <!-- CTA -->
    <div class="pt-2">
      <button type="button"
        class="inline-block px-8 py-3 rounded-lg font-semibold shadow-md hover:shadow-lg transition hover:-translate-y-0.5"
        style="background-color:rgba(88,199,95,0.45)" @click="login()">
        Sign in / Create account →
      </button>

      <p class="text-gray-600 text-sm mt-10 max-w-md mx-auto">
        If you are struggling to sign in please try clearing cookies and refreshing the page
      </p>
    </div>



  </main>
</template>