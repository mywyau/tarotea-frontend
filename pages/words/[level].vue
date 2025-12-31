<script setup lang="ts">
const route = useRoute()
const levelParam = route.params.level as string

const { data: index, error } = await useFetch(
  `/index/words/level/${levelParam}.json`,
  {
    key: `level-words-${levelParam}`
  }
)

// Fail fast during SSR
if (error.value || !index.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Level not available'
  })
}

const safeIndex = computed(() => index.value!)
</script>
<template>
  <main class="max-w-4xl mx-auto px-4 py-12">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-semibold mb-2">
        {{ safeIndex.title }}
      </h1>
      <p class="text-gray-600">
        {{ safeIndex.description }}
      </p>
    </div>

    <!-- Tiles -->
    <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
      <NuxtLink
        v-for="c in safeIndex.words ?? []"
        :key="c.word"
        :to="`/word/${c.word}`"
        class="border rounded-lg p-4 flex flex-col items-center justify-center hover:bg-gray-50 transition"
      >
        <div class="text-3xl mb-1">
          {{ c.word }}
        </div>
        <div class="text-sm text-gray-400">
          {{ c.jyutping }}
        </div>
        <div class="text-xs text-gray-500 mt-1 text-center">
          {{ c.meaning }}
        </div>
      </NuxtLink>
    </div>
  </main>
</template>
