<script setup lang="ts">

const { data: stats } = await useFetch('/api/total-users-stats', {
  server: true,
  lazy: true,
})

</script>

<template>
  <main class="max-w-3xl mx-auto py-20 px-6 min-h-screen">
    <!-- Hero Section -->
    <div class="text-center">

      <h1 class="text-3xl sm:text-4xl font-semibold tracking-tight text-black">
        Learn Cantonese
      </h1>
    </div>

    <!-- Stats -->
    <div class="">

      <h2 class="text-sm uppercase tracking-wide text-gray-500 mt-6 mb-4">
        Online user stats
      </h2>

      <!-- <div class="grid grid-cols-1 sm:grid-cols-2 gap-5"> -->
      <div class="grid grid-cols-1 sm:grid-cols-1 gap-5">
        <div class="rounded-lg p-6 text-center" style="background-color:#F6E1E1; border-color:#F6E1E1;">
          <div class="text-2xl font-semibold text-gray-900">
            {{ stats?.totalUsers ?? '—' }}
            <!-- {{ stats?.paidUsers ?? '—' }} -->
          </div>
          <div class="text-sm text-gray-700 mt-1">
            Learners
          </div>
        </div>

        <!-- 
        <div class="rounded-lg p-6 text-center" style="background-color:#F6E1E1; border-color:#F6E1E1;">
          <div class="text-2xl font-semibold text-gray-900">
            {{ stats?.paidUsers ?? '—' }}
          </div>
          <div class="text-sm text-gray-700 mt-1">
            Active Subscribers
          </div>
        </div> -->
      </div>
    </div>

    <!-- Navigation Tiles -->
    <div class="mt-12 space-y-10">

      <!-- DAILY -->
      <div v-if="true">
        <h2 class="text-sm uppercase tracking-wide text-gray-500 mb-4">
          Daily Exercise
        </h2>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">

          <NuxtLink to="/daily/vocab/v2" class="rounded-xl p-6 flex items-end
      shadow-sm hover:shadow-md transition hover:brightness-105" style="background-color:#F6E1E1;">
            <div>
              <div class="font-semibold text-gray-900">Daily</div>
              <div class="text-xs text-gray-800 mt-1">
                Practice with our daily exercise
              </div>
            </div>
          </NuxtLink>

          <NuxtLink to="/daily/jyutping/v2" class="rounded-xl p-6 flex items-end
      shadow-sm hover:shadow-md transition hover:brightness-105" style="background-color:#F6E1E1;">
            <div>
              <div class="font-semibold text-gray-900">Jyutping Daily</div>
              <div class="text-xs text-gray-800 mt-1">
                Practice your typing and phonetic understanding
              </div>
            </div>
          </NuxtLink>
        </div>
      </div>

      <!-- START LEARNING -->
      <div>
        <h2 class="text-sm uppercase tracking-wide text-gray-500 mb-4">
          Start Learning
        </h2>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 auto-rows-[120px] gap-5">

          <!-- Explore Topics -->
          <NuxtLink to="/topics" class="rounded-xl p-6 flex flex-col justify-end
        shadow-sm hover:shadow-md transition hover:brightness-110
        lg:col-span-4 lg:row-span-2" style="background-color:#EAB8E4;">
            <div class="text-lg font-semibold text-black">
              Topics
            </div>
            <div class="text-sm text-gray-800 mt-2">
              Browse structured vocabulary
            </div>
          </NuxtLink>

          <!-- Levels -->
          <NuxtLink to="/levels" class="rounded-xl p-6 flex items-end
        shadow-sm hover:shadow-md transition hover:brightness-110
        lg:col-span-2 lg:row-span-2" style="background-color:#A8CAE0;">
            <div>
              <div class="font-semibold text-gray-900">Levels</div>
              <div class="text-xs text-gray-800 mt-1">
                Structured progression
              </div>
            </div>
          </NuxtLink>

          <NuxtLink to="/dojo"
            class="rounded-xl p-6 flex items-end shadow-sm hover:shadow-md transition hover:brightness-110"
            style="background-color:rgba(244,205,39,0.35);">
            <div>
              <div class="text-sm font-semibold text-gray-900">Typing Dojo</div>
            </div>
          </NuxtLink>

          <NuxtLink to="/coming-soon" class="rounded-xl p-6 flex items-end
        shadow-sm hover:shadow-md transition hover:brightness-110" style="background-color:#F6E1E1;">
            <div>
              <div class="font-semibold text-gray-900">Coming soon</div>
              <div class="text-xs text-gray-800 mt-1">
                What could it be?
              </div>
            </div>
          </NuxtLink>

          <!-- <NuxtLink to="/coming-soon" class="rounded-xl p-6 flex items-end
        shadow-sm hover:shadow-md transition hover:brightness-110" style="background-color:#D6A3D1;">
            <div>
              <div class="font-semibold text-gray-900">Coming soon</div>
              <div class="text-xs text-gray-800 mt-1">
                Something cool
              </div>
            </div>
          </NuxtLink> -->


          <!-- <NuxtLink to="/coming-soon" class="rounded-xl p-6 flex items-end
        shadow-sm hover:shadow-md transition hover:brightness-110" style="background-color:#A8CAE0;">
            <div>
              <div class="font-semibold text-gray-900">Coming soon</div>
              <div class="text-xs text-gray-800 mt-1">
                Awesome
              </div>
            </div>
          </NuxtLink>  -->


        </div>
      </div>

      <!-- PRACTICE -->
      <div>
        <h2 class="text-sm uppercase tracking-wide text-gray-500 mb-4">
          Practice & Test
        </h2>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">

          <!-- Level Quiz -->
          <NuxtLink to="/quiz" class="rounded-xl p-6 flex items-end
        shadow-sm hover:shadow-md transition hover:brightness-110" style="background-color:#D6A3D1;">
            <div>
              <div class="font-semibold text-gray-900">Level Quiz</div>
              <div class="text-xs text-gray-800 mt-1">
                Practice content based on our levels
              </div>
            </div>
          </NuxtLink>

          <!-- Topic Quiz -->
          <NuxtLink to="/topics/quiz" class="rounded-xl p-6 flex items-end
        shadow-sm hover:shadow-md transition hover:brightness-110" style="background-color:rgba(244,205,39,0.35);">
            <div>
              <div class="font-semibold text-gray-900">Topic Quiz</div>
              <div class="text-xs text-gray-900/80 mt-1">
                Test knowledge
              </div>
            </div>
          </NuxtLink>


        </div>
      </div>

    </div>
  </main>
</template>

<style scoped>
.topic-btn-blush {
  background: rgb(249, 166, 166);
}

.topic-btn-blush:hover {
  background: rgb(204, 136, 136);
}
</style>
