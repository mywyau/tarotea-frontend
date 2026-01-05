<script setup lang="ts">
import WordTile from '@/components/WordTile.vue';

const route = useRoute()

const slug = computed(() => route.params.slug as string)

const { data: topic, error, pending } = await useFetch(
  () => `/api/index/topics/${slug.value}`,
  {
    key: () => `topic-${slug.value}`,
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

    <section v-for="section in safeTopic.sections ?? []" :key="section.title" class="space-y-4">
      <h2 class="text-lg font-semibold mt-8">
        {{ section.title }}
      </h2>

      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        <WordTile v-for="item in section.items ?? []" :to="`/word/${item.word}`" :key="item.id" :word="item.word" :jyutping="item.jyutping"
          :meaning="item.meaning" />
      </div>
    </section>

    <section v-if="safeTopic.phrases?.length">
      <h2 class="text-lg font-semibold mt-8 mb-4">
        Phrases
      </h2>
    </section>
  </main>


</template>
