<script setup lang="ts">
const { data: stats } = await useFetch('/api/stats', {
  server: true,   // fetch on server for fast first render
  lazy: true,     // don’t block page load if slow
})
</script>

<template>
  <main class="max-w-xl mx-auto py-16 px-4 sm:px-6 text-center">

    <div class="mt-12 grid grid-cols-2 gap-6 text-center">

      <div class="rounded-lg border p-6">
        <div class="text-base font-semibold">
          {{ stats?.totalUsers ?? '—' }}
        </div>
        <div class="text-sm text-gray-500">
          Total users
        </div>
      </div>

      <div class="rounded-lg border p-6">
        <div class="text-base font-semibold">
          {{ stats?.paidUsers ?? '—' }}
        </div>
        <div class="text-sm text-gray-500">
          Active learners
        </div>
      </div>

    </div>

    <p class="mt-8 text-lg text-gray-600">
      Learn and understand everyday Cantonese
    </p>

    <div class="mt-4">
      <NuxtLink to="/topics" class="mt-8 inline-block bg-white text-gray-600 font-semibold px-6 py-3 transition-transform duration-150 hover:scale-[1.05] active:scale-[0.98]">
        Start with viewing some vocabulary topics →
      </NuxtLink>
    </div>

  </main>
</template>
