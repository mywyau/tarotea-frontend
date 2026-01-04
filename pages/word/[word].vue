<script setup lang="ts">
const route = useRoute()

const wordParam = computed(() => route.params.word as string)

const { data: word, error, pending } = await useFetch(
  () => `/api/words/numbers/${decodeURIComponent(wordParam.value)}`,
  {
    key: () => `word-${wordParam.value}`,
    server: true
  }
)

const cdnBase = useRuntimeConfig().public.cdnBase;

const WORD_PATHS: Record<string, string> = {
  // units
  零: "units",
  一: "units",
  二: "units",
  三: "units",
  四: "units",
  五: "units",
  六: "units",
  七: "units",
  八: "units",
  九: "units",
  十: "units",

  // teens
  十一: "teens",
  十二: "teens",
  十三: "teens",
  十四: "teens",
  十五: "teens",
  十六: "teens",
  十七: "teens",
  十八: "teens",
  十九: "teens",

  // tens
  二十: "tens",
  三十: "tens",
  四十: "tens",
  五十: "tens",
  六十: "tens",
  七十: "tens",
  八十: "tens",
  九十: "tens",

  // beyond
  一百: "beyond",
  二百: "beyond",
  一千: "beyond",
  一萬: "beyond",
  十萬: "beyond",
  一百萬: "beyond",
};

const folder = computed(() => {
  const f = WORD_PATHS[wordParam.value];
  if (!f) console.warn("No audio folder for", wordParam.value);
  return f;
});

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

      <AudioButton v-if="folder" :src="`${cdnBase}/audio/words/${folder}/${wordParam.value}/${safeWord.word}.mp3`" />
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
              {{ example }}
            </span>

            <AudioButton v-if="folder" :src="`${cdnBase}/audio/words/${folder}/${wordParam.value}/${example}.mp3`" />
          </div>
        </li>


      </ul>
    </section>
  </main>
</template>
