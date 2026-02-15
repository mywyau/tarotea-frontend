<script setup lang="ts">

definePageMeta({
  middleware: ['level-word-access'],
  ssr: true,
})

const route = useRoute()
const runtimeConfig = useRuntimeConfig()

// Dynamic params
const level = computed(() => route.params.slug as string)
const id = computed(() => decodeURIComponent(route.params.id as string))

// Fetch word data
const { data, error } = await useFetch(
  () => `/api/words/${id.value}`,
  {
    key: () => `word-${id.value}`,
    server: true,
  }
)

const cdnBase = runtimeConfig.public.cdnBase
const { volume } = useAudioVolume()

const word = computed(() => data.value)
const notFound = computed(() => error.value?.statusCode === 404)

// Format level label (level-four → Level Four)
const formattedLevel = computed(() => {
  return level.value
    .replace(/-/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase())
})

const MASTERY_XP = 1000

const masteryPercent = computed(() => {
  const value = xp.value ?? 0
  return Math.min((value / MASTERY_XP) * 100, 100)
})

const xp = ref<number>(0)
const streak = ref<number>(0)

onMounted(async () => {
  try {
    const { getAccessToken } = await useAuth()
    const token = await getAccessToken()


    const progressMap = await $fetch<
      Record<string, { xp: number; streak: number }>
    >(
      '/api/word-progress',
      {
        query: { wordIds: id.value },
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    )

    xp.value = progressMap[id.value]?.xp ?? 0
    streak.value = progressMap[id.value]?.streak ?? 0

  } catch (err) {
    // not logged in or failed → ignore
  }
})


</script>

<template>

  <main v-if="word" class="max-w-2xl mx-auto px-4 py-12 space-y-10">

    <!-- Back link -->
    <NuxtLink :to="`/level/${level}`" class="block text-gray-500 hover:underline">
      ← {{ formattedLevel }} Vocab
    </NuxtLink>

    <!-- Word header -->
    <section class="text-center space-y-4">

      <div class="text-4xl font-medium">
        {{ word.word }}
      </div>

      <div class="text-lg text-gray-400">
        {{ word.jyutping }}
      </div>

      <div class="text-lg text-gray-600">
        {{ word.meaning }}
      </div>

      <!-- XP block -->
      <div class="pt-6 space-y-3">

        <!-- XP + label -->
        <div class="flex justify-between text-sm text-gray-500 max-w-xs mx-auto">
          {{ xp }} XP
        </div>

        <!-- Progress bar -->
        <div class="w-full max-w-xs mx-auto h-2 bg-gray-200 rounded overflow-hidden">
          <div class="h-2 bg-green-500 transition-all duration-700 ease-out" :style="{ width: masteryPercent + '%' }" />
        </div>
      </div>

      <!-- Audio button with more breathing space -->
      <div class="pt-8">
        <AudioButton v-if="word.audio?.word" :src="`${cdnBase}/audio/${word.audio.word}`" />
      </div>

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

    <!-- Volume -->
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
