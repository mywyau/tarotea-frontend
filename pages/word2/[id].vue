<script setup lang="ts">


const route = useRoute()

const wordId = computed(() => route.params.id as string)

const { data: word, error, pending } = await useFetch<WordEntry>(
  () => `/api/words/${wordId.value}`,
  {
    key: () => `word-${wordId.value}`,
    server: true
  }
)

console.log(`api/words/${wordId.value}`)

const cdnBase = useRuntimeConfig().public.cdnBase

const notFound = computed(() => error.value?.statusCode === 404)
const safeWord = computed(() => word.value)
</script>

<template>
  <main v-if="safeWord" class="max-w-2xl mx-auto px-4 py-12 space-y-10">
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

      <AudioButton v-if="safeWord.audio?.word" :src="`${cdnBase}/audio/words/${safeWord.audio.word}`" />
    </section>

    <!-- Usage notes -->
    <section v-if="safeWord.usage?.length">
      <h2 class="text-lg font-semibold mb-3">
        Usage
      </h2>

      <ul class="list-disc pl-5 space-y-2 text-gray-700">
        <li v-for="note in safeWord.usage" :key="note">
          {{ note }}
        </li>
      </ul>
    </section>

    <!-- Examples -->
    <section v-if="safeWord.examples?.length">
      <h2 class="text-lg font-semibold mb-3">
        Examples
      </h2>

      <ul class="space-y-4">
        <li v-for="(example, idx) in safeWord.examples" :key="example.sentence"
          class="border-l-4 border-gray-200 pl-4 pr-4 py-2 space-y-1">
          <div class="flex items-center justify-between gap-4">
            <div>
              <div class="text-lg">
                {{ example.sentence }}
              </div>
              <div class="text-sm text-gray-400">
                {{ example.jyutping }}
              </div>
              <div class="text-sm text-gray-600">
                {{ example.meaning }}
              </div>
            </div>

            <AudioButton v-if="safeWord.audio?.examples?.[idx]" :src="`${cdnBase}/audio/words/${safeWord.audio.examples[idx]}`" />
          </div>
        </li>
      </ul>
    </section>
  </main>

  <!-- 404 -->
  <div v-else-if="notFound" class="text-center py-24 text-gray-500">
    Word not found
  </div>
</template>
