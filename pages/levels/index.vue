<script setup lang="ts">
const levels = [
  {
    id: 'level-one',
    title: 'Level 1',
    description: 'Foundation vocabulary for basic spoken Cantonese: identity, actions, daily life, and simple needs.'
  },
  // {
  //   id: 'level-two',
  //   title: 'Level  2',
  //   description: 'Spoken Cantonese for daily situations, intentions, feelings, and simple reasoning.'
  // },
  // {
  //   id: 'level-three',
  //   title: 'Level  3',
  //   description: 'Intermediate spoken Cantonese. Expressing thoughts, reasons, and everyday abstract concepts naturally.'
  // },
  // {
  //   id: 'level-four',
  //   title: 'Level  4',
  //   description: 'Express opinions, explain situations, discuss experiences, and handle real-life problems in natural spoken Cantonese.'
  // },
  //   {
  //   id: 'level-five',
  //   title: 'Level  5',
  //   description: 'Handle work situations, services, expectations, and real-life responsibilities in natural spoken Cantonese.'
  // },
]
</script>

<template>
  <main class="max-w-3xl mx-auto py-12 px-4">
    <h1 class="text-3xl font-semibold mb-4">
      Levels
    </h1>

    <p class="text-gray-600 mb-8">
      Explore Cantonese sentence patterns organised by Level
    </p>

    <ul class="space-y-4">
      <li v-for="level in levels" :key="level.id" class="border rounded p-4 hover:bg-gray-50">
        <NuxtLink :to="`/level/${level.id}`" class="block">
          <div class="text-lg font-medium">
            {{ level.title }}
          </div>
          <div class="text-sm text-gray-600">
            {{ level.description }}
          </div>
        </NuxtLink>
      </li>
    </ul>
  </main>
</template>
