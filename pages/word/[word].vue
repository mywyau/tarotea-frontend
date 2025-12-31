<script setup lang="ts">
const route = useRoute()

// The Chinese word itself (e.g. 一, 唔知, 啦)
const wordParam = route.params.word as string

const { data: word, error } = await useFetch(
  `/content/cantonese/words/${wordParam}.json`,
  {
    key: `word-${wordParam}`,
    server: false
  }
)

// Fail fast during SSR
if (error.value || !word.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Word not found'
  })
}


const safeWord = computed(() => word.value!)
</script>

<template>
  <main class="max-w-2xl mx-auto px-4 py-12 space-y-10">
    <!-- Word header -->
    <section class="text-center space-y-2">
      <div class="text-4xl font-medium">
        {{ safeWord.word }}
      </div>

      <div class="text-lg text-gray-400">
        {{ safeWord.jyutping }}
      </div>

      <div class="text-lg text-gray-600">
        {{ safeWord.meaning }}
      </div>

      <AudioButton :src="`/audio/words/${safeWord.id}.mp3`" />
    </section>

    <!-- Usage notes -->
    <section v-if="safeWord.usage?.length">
      <h2 class="text-lg font-semibold mb-3">
        Usage
      </h2>

      <ul class="list-disc pl-5 space-y-2 text-gray-700">
        <li v-for="note in safeWord.usage ?? []" :key="note">
          {{ note }}
        </li>
      </ul>
    </section>

    <!-- Examples -->
    <section v-if="safeWord.examples?.length">
      <h2 class="text-lg font-semibold mb-3">
        Examples
      </h2>

      <ul class="space-y-3">

        <li v-for="example in safeWord.examples ?? []" :key="example" class="border-l-4 border-gray-200 pl-4 pr-4 py-2">
          <div class="flex items-center justify-between gap-4">
            <span class="text-lg">
              {{ example.word }}
            </span>
            
            <AudioButton :src="`/audio/words/${example.id}.mp3`" />
          </div>
        </li>

      </ul>
    </section>
  </main>
</template>
