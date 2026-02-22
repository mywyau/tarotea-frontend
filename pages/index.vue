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

      <h1 class="text-3xl sm:text-4xl font-semibold tracking-tight text-black">
        Learn Everyday Cantonese
      </h1>

      <p class="mt-4 text-lg text-gray-700 max-w-xl mx-auto">
        Structured vocabulary, audio practice, and quizzes designed to help you
        build real understanding.
      </p>

      <NuxtLink to="/topics" class="mt-8 inline-block font-semibold px-8 py-3 rounded-lg
         bg-black
         shadow-md hover:shadow-lg
         hover:-translate-y-0.5
         active:scale-[0.98]
         transition-all duration-300">
        <span class="bg-gradient-to-r
           from-[#EAB8E4]
           via-[#A8CAE0]
           to-[#D6A3D1]
           bg-clip-text text-transparent
           transition-all duration-300
           hover:brightness-125">
          Start Learning →
        </span>
      </NuxtLink>
    </div>

    <!-- Stats -->
    <div class="mt-6 grid grid-cols-2 gap-6">

      <div class="rounded-lg p-6 text-center" style="background-color:#F6E1E1; border-color:#F6E1E1;">
        <div class="text-2xl font-semibold text-gray-900">
          {{ stats?.totalUsers ?? '—' }}
        </div>
        <div class="text-sm text-gray-700 mt-1">
          Learners
        </div>
      </div>

      <div class="rounded-lg p-6 text-center" style="background-color:#F6E1E1; border-color:#F6E1E1;">
        <div class="text-2xl font-semibold text-gray-900">
          {{ stats?.paidUsers ?? '—' }}
        </div>
        <div class="text-sm text-gray-700 mt-1">
          Active Subscribers
        </div>
      </div>

    </div>

    <!-- Navigation Tiles -->
    <div class="mt-10">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 auto-rows-[120px] gap-5">

        <!-- Explore Topics -->
        <NuxtLink to="/topics" class="rounded-xl p-6 flex flex-col justify-end
             shadow-sm hover:shadow-md transition
             hover:brightness-110
             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
             lg:col-span-4 lg:row-span-2" style="background-color:#EAB8E4;">
          <div class="text-lg font-semibold text-black">
            Explore Topics
          </div>
          <div class="text-sm text-gray-800 mt-2">
            Browse structured vocabulary
          </div>
        </NuxtLink>

        <!-- Levels -->
        <NuxtLink to="/levels" class="rounded-xl p-6 flex items-end
             shadow-sm hover:shadow-md transition
             hover:brightness-110
             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
             lg:col-span-2 lg:row-span-2" style="background-color:#A8CAE0;">
          <div>
            <div class="font-semibold text-gray-900">Levels</div>
            <div class="text-xs text-gray-800 mt-1">
              Structured progression
            </div>
          </div>
        </NuxtLink>

        <!-- Topic Quiz -->
        <NuxtLink to="/topics/quiz" class="rounded-xl p-6 flex items-end
             shadow-sm hover:shadow-md transition
             hover:brightness-110
             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
             lg:col-span-2" style="background-color:#F4C2D7;">
          <div>
            <div class="font-semibold text-gray-900">Topic Quiz</div>
            <div class="text-xs text-gray-900/80 mt-1">
              Test knowledge
            </div>
          </div>
        </NuxtLink>

        <!-- Daily -->
        <NuxtLink to="/daily/v3" class="rounded-xl p-6 flex items-end
             shadow-sm hover:shadow-md transition
             hover:brightness-105
             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
             lg:col-span-2 lg:row-span-2" style="background-color:#F6E1E1;">
          <div>
            <div class="font-semibold text-gray-900">Daily</div>
            <div class="text-xs text-gray-800 mt-1">
              Practice with our daily exercise
            </div>
          </div>
        </NuxtLink>

        <!-- Level Quiz -->
        <NuxtLink to="/quiz" class="rounded-xl p-6 flex items-end
             shadow-sm hover:shadow-md transition
             hover:brightness-110
             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
             lg:col-span-2" style="background-color:#D6A3D1;">
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