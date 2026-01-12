<script setup lang="ts">
import WordTile from '@/components/WordTile.vue'

const route = useRoute()
const slug = computed(() => route.params.slug as string)

const { data: topic, error, pending } = await useFetch(
  () => `/api/index/levels/${slug.value}`,
  {
    key: () => `index-level-${slug.value}`,
    server: true
  }
)

const safeTopic = computed(() => topic.value)

/**
 * Normalize categories into an iterable structure
 */
const categories =
  computed(
    () => {
      if (!safeTopic.value?.categories) return []

      return Object.entries(safeTopic.value.categories).map(
        ([key, words]) => ({
          key,
          title: key.replace(/_/g, ' '), // optional prettifying
          words
        })
      )
    }
  )

</script>

<template>
  <main v-if="safeTopic" class="max-w-4xl mx-auto px-4 py-12 space-y-12">
    <!-- Level header -->
    <header class="space-y-2">
      <h1 class="text-3xl font-semibold">
        {{ safeTopic.title }}
      </h1>

      <p class="text-gray-600">
        {{ safeTopic.description }}
      </p>
    </header>

    <!-- Categories -->
    <section v-for="category in categories" :key="category.key" class="space-y-4">
      <h2 class="text-xl font-medium capitalize">
        {{ category.title }}
      </h2>

      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        <WordTile v-for="word in category.words" :key="word.word" :to="`/level/${slug}/word/${word.word}`"
          :word="word.word" :jyutping="word.jyutping" :meaning="word.meaning" />
      </div>
    </section>
  </main>
</template>
