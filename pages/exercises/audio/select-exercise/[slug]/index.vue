<script setup lang="ts">

definePageMeta({
  middleware: ['coming-soon'],
  ssr: true,
})

import { computed, onMounted } from 'vue'

const route = useRoute()
const levelId = computed(() => route.params.slug as string)

const {
  authReady,
  resolve,
} = useMeStateV2()

onMounted(async () => {
  if (!authReady.value) {
    await resolve()
  }
})

const levelMeta = computed(() => {
  const map: Record<string, { title: string; description: string }> = {
    'level-one': {
      title: 'Level 1',
      description: 'Foundation vocabulary, actions, and everyday usage.'
    },
    'level-two': {
      title: 'Level 2',
      description: 'Daily situations, intentions, and feelings.'
    },
    'level-three': {
      title: 'Level 3',
      description: 'Expressing thoughts and reasons naturally.'
    },
  }

  return map[levelId.value]
})

if (!levelMeta.value) {
  throw createError({ statusCode: 404, statusMessage: 'Level not found' })
}
</script>

<template>
  <main class="max-w-3xl mx-auto py-12 px-4 space-y-10">

    <!-- Back -->
    <NuxtLink
      to="/exercises"
      class="text-sm text-gray-500 hover:underline"
    >
      ← Back to exercises
    </NuxtLink>

    <!-- Header -->
    <div class="space-y-2">
      <h1 class="text-3xl font-semibold">
        {{ levelMeta.title }}
      </h1>
      <p class="text-gray-600">
        {{ levelMeta.description }}
      </p>
    </div>

    <!-- Choice -->
    <div class="grid gap-4 sm:grid-cols-2">

      <!-- Vocabulary -->
      <NuxtLink
        :to="`/exercise/${levelId}/vocab/start-exercise`"
        class="rounded-xl border p-6 transition hover:bg-gray-50"
      >
        <h2 class="text-lg font-medium mb-1">
          Vocabulary practice
        </h2>
        <p class="text-sm text-gray-600">
          Learn and recognise individual words used in everyday Cantonese.
        </p>
      </NuxtLink>

      <!-- Sentences -->
      <NuxtLink
        :to="`/exercise/vocab/sentences/${levelId}`"
        class="rounded-xl border p-6 transition hover:bg-gray-50"
      >
        <h2 class="text-lg font-medium mb-1">
          Sentence practice
        </h2>
        <p class="text-sm text-gray-600">
          Understand meaning in full, natural sentences.
        </p>
      </NuxtLink>

    </div>

  </main>
</template>
