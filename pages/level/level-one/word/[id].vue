<script setup lang="ts">

const route = useRoute()
const runtimeConfig = useRuntimeConfig()

const id = computed(() => decodeURIComponent(route.params.id as string))

const { data, error } = await useFetch(
  () => `/api/words/${id.value}`,
  {
    key: () => `word-${id.value}`,
    server: true
  }
)

const { volume } = useAudioVolume()

const cdnBase = runtimeConfig.public.cdnBase

const word = computed(() => data.value)
const notFound = computed(() => error.value?.statusCode === 404)
</script>

<template>
  <main v-if="word" class="max-w-2xl mx-auto px-4 py-12 space-y-10">
    <!-- Word header -->
    <section class="text-center space-y-2">
      <div class="text-4xl font-medium">
        {{ word.word }}
      </div>

      <div class="text-lg text-gray-400">
        {{ word.jyutping }}
      </div>

      <div class="text-lg text-gray-600">
        {{ word.meaning }}
      </div>

      <AudioButton v-if="word.audio?.word" :src="`${cdnBase}/audio/${word.audio.word}`" />
    </section>

    <!-- Usage -->
    <section v-if="word.usage?.length">
      <h2 class="text-lg font-semibold mb-3">
        Usage
      </h2>

      <ul class="list-disc pl-5 space-y-2 text-gray-700">
        <li v-for="note in word.usage" :key="note">
          {{ note }}
        </li>
      </ul>
    </section>

    <!-- ✅ ONE global volume slider -->
    <div class="flex items-center justify-center gap-3 pt-2 text-sm text-gray-500">
      <span class="select-none">Volume</span>

      <input type="range" min="0" max="1" step="0.01" v-model="volume" class="w-32 accent-black" />

      <span class="w-8 text-left tabular-nums">
        {{ Math.round(volume * 100) }}%
      </span>
    </div>

    <!-- Examples -->
    <section v-if="word.examples?.length">
      <h2 class="text-lg font-semibold mb-3">
        Examples
      </h2>

      <ul class="space-y-4">
        <li v-for="(example, index) in word.examples" :key="example.sentence"
          class="border-l-4 border-gray-200 pl-4 py-2">
          <div class="space-y-1">
            <div class="flex items-center justify-between gap-4">
              <span class="text-lg">
                {{ example.sentence }}
              </span>

              <AudioButton v-if="word.audio?.examples?.[index]"
                :src="`${cdnBase}/audio/${word.audio.examples[index]}`" />

              <!-- {{ `${cdnBase}/audio/${word.audio.examples[index]}` }} -->
            </div>

            <div class="text-sm text-gray-400">
              {{ example.jyutping }}
            </div>

            <div class="text-sm text-gray-600">
              {{ example.meaning }}
            </div>
          </div>
        </li>
      </ul>
    </section>
  </main>

  <!-- 404 -->
  <div v-else-if="notFound" class="max-w-xl mx-auto px-4 py-24 text-center text-gray-500">
    Word not found
  </div>
</template>
