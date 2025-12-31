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
</script>

<template>
  <!-- SUCCESS -->
  <main
    v-if="word"
    class="max-w-2xl mx-auto px-4 py-12 space-y-10"
  >
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
    </section>

    <!-- Usage notes -->
    <section v-if="word.usage?.length">
      <h2 class="text-lg font-semibold mb-3">
        Usage
      </h2>
      <ul class="list-disc pl-5 space-y-2 text-gray-700">
        <li
          v-for="note in word.usage"
          :key="note"
        >
          {{ note }}
        </li>
      </ul>
    </section>

    <!-- Examples -->
    <section v-if="word.examples?.length">
      <h2 class="text-lg font-semibold mb-3">
        Examples
      </h2>
      <ul class="space-y-3">
        <li
          v-for="ex in word.examples"
          :key="ex"
          class="border-l-4 border-gray-200 pl-4"
        >
          {{ ex }}
        </li>
      </ul>
    </section>
  </main>

  <!-- ERROR -->
  <div
    v-else-if="error"
    class="max-w-xl mx-auto px-4 py-12 text-center space-y-4"
  >
    <p class="text-red-600">
      This word doesn’t exist yet.
    </p>
    <NuxtLink to="/" class="underline">
      Go home
    </NuxtLink>
  </div>

  <!-- LOADING -->
  <div
    v-else
    class="max-w-xl mx-auto px-4 py-12 text-center text-gray-500"
  >
    Loading…
  </div>
</template>
