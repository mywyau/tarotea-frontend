<script setup lang="ts">
import WordTile from '@/components/WordTile.vue';

const route = useRoute()

const slug = computed(() => route.params.slug as string)

const { data: topic, error, pending } = await useFetch(
  () => `/api/words/level/${slug.value}`,
  {
    key: () => `words-level-${slug.value}`,
    server: true
  }
)

const safeTopic = computed(() => topic.value)

</script>

<template>
  <main v-if="safeTopic" class="max-w-4xl mx-auto px-4 py-12 space-y-8">
    <h1 class="text-3xl font-semibold">
      {{ safeTopic.title }}
    </h1>

    <p class="text-gray-600">
      {{ safeTopic.description }}
    </p>

    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      <WordTile v-for="word in safeTopic.words ?? []" :key="word.word" :word="word.word" :jyutping="word.jyutping"
        :meaning="word.meaning" />
    </div>
  </main>
</template>
