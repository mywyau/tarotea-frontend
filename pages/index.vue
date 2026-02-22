<script setup lang="ts">
const { data: stats } = await useFetch('/api/stats', {
  server: true,
  lazy: true,
})
</script>

<template>
  <main class="max-w-3xl mx-auto py-20 px-6 min-h-screen">
    <!-- Hero Section -->
    <div class="text-center">

      <h1 class="text-3xl sm:text-4xl font-semibold tracking-tight text-gray-900">
        Learn Everyday Cantonese
      </h1>

      <p class="mt-4 text-lg text-gray-700 max-w-xl mx-auto">
        Structured vocabulary, audio practice, and quizzes designed to help you
        build real understanding.
      </p>

      <NuxtLink to="/topics" class="mt-8 inline-block text-gray-900 font-semibold px-8 py-3 rounded-lg
               shadow-sm hover:shadow-md active:scale-[0.98] transition
               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        style="background-color:#D6A3D1;">
        Start Learning →
      </NuxtLink>

    </div>

    <!-- Stats -->
    <div class="mt-16 grid grid-cols-2 gap-6">

      <div class="rounded-lg p-6 text-center"
        style="background-color:#F6E1E1; border-color:#F6E1E1;">
        <div class="text-2xl font-semibold text-gray-900">
          {{ stats?.totalUsers ?? '—' }}
        </div>
        <div class="text-sm text-gray-700 mt-1">
          Learners
        </div>
      </div>

      <div class="rounded-lg p-6 text-center"
        style="background-color:#F6E1E1; border-color:#F6E1E1;">
        <div class="text-2xl font-semibold text-gray-900">
          {{ stats?.paidUsers ?? '—' }}
        </div>
        <div class="text-sm text-gray-700 mt-1">
          Active Subscribers
        </div>
      </div>

    </div>

    <!-- Navigation Tiles -->
    <div class="mt-20">
      <div class="grid grid-cols-4 auto-rows-[120px] gap-5">

        <!-- Large Wide Tile -->
        <NuxtLink to="/topics" class="col-span-4 row-span-2 rounded-xl p-8 flex flex-col justify-end
                  shadow-sm hover:shadow-md transition
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          style="background-color:#EAB8E4; border-color:rgba(0,0,0,0.08);">
          <div class="text-xl font-semibold text-gray-900">
            Explore Topics
          </div>
          <div class="text-sm text-gray-800 mt-2">
            Browse structured vocabulary
          </div>
        </NuxtLink>

        <!-- Tall Tile -->
        <NuxtLink to="/levels" class="col-span-2 row-span-2 rounded-xl p-6 flex items-end
                  shadow-sm hover:shadow-md transition
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          style="background-color:#A8CAE0; border-color:rgba(0,0,0,0.08);">
          <div>
            <div class="font-semibold text-gray-900">Levels</div>
            <div class="text-xs text-gray-800 mt-1">
              Structured progression
            </div>
          </div>
        </NuxtLink>

        <!-- Small Tile -->
        <NuxtLink to="/topics/quiz" class="col-span-2 rounded-xl p-6 flex items-end
                shadow-sm hover:shadow-md transition
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          style="background-color:#F4C2D7; border-color:rgba(0,0,0,0.10);">
          <div>
            <div class="font-semibold text-gray-900">Topic Quiz</div>
            <div class="text-xs text-gray-900/80 mt-1">
              Test knowledge
            </div>
          </div>
        </NuxtLink>

        <!-- Small Tile -->
        <NuxtLink to="/quiz" class="col-span-2 rounded-xl p-6 flex items-end
                  shadow-sm hover:shadow-md transition
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          style="background-color:#D6A3D1; border-color:rgba(0,0,0,0.08);">
          <div>
            <div class="font-semibold text-gray-900">Level Quiz</div>
            <div class="text-xs text-gray-800 mt-1">
              Practice by level
            </div>
          </div>
        </NuxtLink>

      </div>
    </div>

  </main>
</template>