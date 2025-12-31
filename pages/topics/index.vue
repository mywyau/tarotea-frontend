<script setup lang="ts">

const topics = [
  {
    id: 'numbers',
    title: 'Numbers',
    description: 'Counting, prices, quantities, and amounts.'
  },
  {
    id: 'particles',
    title: 'Particles',
    description: 'Sentence-final particles that shape tone and meaning.'
  },
  {
    id: 'measure-words',
    title: 'Measure Words',
    description: 'Classifiers used with numbers and objects.',
  },
  {
    id: 'colours',
    title: 'Colours',
    description: 'Learn colour words and usage',
  }
]

</script>

<template>
  <main class="max-w-3xl mx-auto py-12 px-4">

    <!-- Header -->
    <header class="space-y-2 mb-4">
      <h1 class="text-3xl font-semibold mb-4">
        Topics
      </h1>
      <p class="text-gray-600 mb-8">
        Explore spoken Cantonese by theme.
      </p>
    </header>

    <ul class="space-y-4">
      <li v-for="topic in topics" :key="topic.id" class="border rounded p-4 hover:bg-gray-50">
        <NuxtLink :to="`/topics/${topic.id}`" class="block">
          <div class="text-lg font-medium">
            {{ topic.title }}
          </div>
          <div class="text-sm text-gray-600">
            {{ topic.description }}
          </div>
        </NuxtLink>
      </li>
    </ul>
  </main>
</template>
