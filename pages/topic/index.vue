<script setup lang="ts">

// definePageMeta({
//   middleware: ['coming-soon'],
//   ssr: true,
// })

import { onMounted } from 'vue'
import { canAccessTopic } from '~/utils/topics/permissions'
import { topics } from '~/utils/topics/topics'

const {
  state,
  authReady,
  isLoggedIn,
  user,
  entitlement,
  isCanceling,
  currentPeriodEnd,
  resolve,
} = useMeStateV2()

// Resolve auth once on mount (safe + idempotent)
onMounted(async () => {
  if (!authReady.value) {
    await resolve()
  }
})

const isComingSoon = (topic: any) => topic.comingSoon === true

const canEnterTopic = (topic: any) => {

  if (isComingSoon(topic)) return false

  return canAccessTopic(isLoggedIn.value, entitlement.value, topic)
}

</script>


<template>
  <main class="max-w-5xl mx-auto py-12 px-4">

    <h1 class="text-3xl font-semibold mb-4">
      Topics
    </h1>

    <p class="text-gray-600 mb-8">
      Vocabulary and sentences grouped by subject matter
    </p>

    <ul class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">

      <li v-for="topic in topics" :key="topic.id" class="border rounded p-4 space-y-3 transition" :class="[
        topic.comingSoon
          ? 'bg-gray-50 text-gray-400 cursor-not-allowed opacity-80'
          : canEnterTopic(topic)
            ? 'hover:bg-gray-50'
            : 'opacity-80'
      ]">

        <NuxtLink :to="`topics/words/${topic.id}`" class="block space-y-3">

          <div class="text-lg font-medium">
            {{ topic.title }}
            <span v-if="topic.comingSoon" class="text-sm text-gray-400 font-normal">
              (Coming soon)
            </span>
          </div>

          <div class="text-sm text-gray-600">
            {{ topic.description }}
          </div>
        </NuxtLink>
      </li>

    </ul>

  </main>
</template>
