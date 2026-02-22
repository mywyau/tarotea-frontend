<script setup lang="ts">
const { data: stats } = await useFetch('/api/stats', {
  server: true,
  lazy: true,
})
</script>

<template>
  <main class="max-w-3xl mx-auto py-20 px-6">

    <!-- Hero Section -->
    <div class="text-center">

      <h1 class="text-3xl sm:text-4xl font-semibold tracking-tight text-gray-900">
        Learn Everyday Cantonese
      </h1>

      <p class="mt-4 text-lg text-gray-600 max-w-xl mx-auto">
        Structured vocabulary, audio practice, and quizzes designed to help you
        build real understanding.
      </p>

      <NuxtLink
        to="/topics"
        class="mt-8 inline-block bg-gray-900 text-white
               font-medium px-8 py-3 rounded-lg
               hover:bg-gray-800 active:bg-gray-900
               transition"
      >
        Start Learning →
      </NuxtLink>

    </div>

    <!-- Stats -->
    <div class="mt-16 grid grid-cols-2 gap-6">

      <div class="rounded-lg bg-gray-50 border border-gray-200 p-6 text-center">
        <div class="text-2xl font-semibold text-gray-900">
          {{ stats?.totalUsers ?? '—' }}
        </div>
        <div class="text-sm text-gray-500 mt-1">
          Learners
        </div>
      </div>

      <div class="rounded-lg bg-gray-50 border border-gray-200 p-6 text-center">
        <div class="text-2xl font-semibold text-gray-900">
          {{ stats?.paidUsers ?? '—' }}
        </div>
        <div class="text-sm text-gray-500 mt-1">
          Active Subscribers
        </div>
      </div>

    </div>

    <!-- Navigation Tiles -->
    <div class="mt-20">

      <div class="grid grid-cols-2 gap-5">

        <!-- Primary Tile (Now Subtle) -->
        <NuxtLink
          to="/topics"
          class="col-span-2 rounded-lg bg-gray-100
                 text-gray-900 p-10 border border-gray-200
                 hover:bg-gray-200
                 transition"
        >
          <div class="text-2xl font-semibold">
            Explore Topics
          </div>
          <div class="text-sm text-gray-600 mt-2">
            Browse vocabulary categories with audio examples.
          </div>
        </NuxtLink>

        <!-- Secondary Tiles -->
        <NuxtLink
          to="/levels"
          class="rounded-lg border border-gray-200 bg-white p-6
                 hover:bg-gray-50
                 transition"
        >
          <div class="font-medium text-gray-900">
            Levels
          </div>
          <div class="text-xs text-gray-500 mt-2">
            Structured progression
          </div>
        </NuxtLink>

        <NuxtLink
          to="/topics/quiz"
          class="rounded-lg border border-gray-200 bg-white p-6
                 hover:bg-gray-50
                 transition"
        >
          <div class="font-medium text-gray-900">
            Topic Quiz
          </div>
          <div class="text-xs text-gray-500 mt-2">
            Test vocabulary knowledge
          </div>
        </NuxtLink>

        <NuxtLink
          to="/quiz"
          class="rounded-lg border border-gray-200 bg-white p-6
                 hover:bg-gray-50
                 transition"
        >
          <div class="font-medium text-gray-900">
            Level Quiz
          </div>
          <div class="text-xs text-gray-500 mt-2">
            Practice by level
          </div>
        </NuxtLink>

      </div>

    </div>

  </main>
</template>