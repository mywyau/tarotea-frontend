<script setup lang="ts">
import WordTile from '@/components/WordTile.vue'

const route = useRoute()
const slug = route.params.slug as string

const { data: topic, error } = await useFetch(
  `/index/topics/${slug}.json`,
  {
    key: `topic-${slug}`,
    server: false
  }
)

console.log(`/index/topics/${slug}.json`)
</script>

<template>
  <main class="max-w-4xl mx-auto px-4 py-12 space-y-8">
    <div v-if="topic">
      <h1 class="text-3xl font-semibold">
        {{ topic.title }}
      </h1>
      <p class="text-gray-600">
        {{ topic.description }}
      </p>

      <!-- Words -->
      <!-- <section v-if="topic.words?.length">
        <h2 class="text-lg font-semibold mt-8 mb-4">
          Words
        </h2>

        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          <WordTile v-for="id in topic.sections.words" :key="id" :id="id" />
        </div>
      </section> -->

      <section v-for="section in topic.sections" :key="section.title" class="space-y-4">
        <h2 class="text-lg font-semibold mt-8">
          {{ section.title }}
        </h2>

        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          <WordTile v-for="item in section.items" :key="item.word" :word="item.word" :jyutping="item.jyutping" :meaning="item.meaning" />
        </div>
      </section>


      <!-- Phrases (later) -->
      <section v-if="topic.phrases?.length">
        <h2 class="text-lg font-semibold mt-8 mb-4">
          Phrases
        </h2>
        <!-- PhraseTile goes here later -->
      </section>
    </div>

    <div v-else-if="error" class="text-red-600">
      Topic not found
    </div>

    <div v-else class="text-gray-500">
      Loading…
    </div>
  </main>
</template>
