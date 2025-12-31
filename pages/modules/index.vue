<script setup lang="ts">
const modules = [
  {
    slug: 'daily',
    title: 'Daily Spoken Cantonese',
    description: 'Essential phrases and patterns used in everyday Cantonese conversation.'
  },
  {
    slug: 'introductions',
    title: 'Introductions & Small Talk',
    description: 'Greeting people, introducing yourself, and making simple small talk.'
  },
  {
    slug: 'questions',
    title: 'Asking Questions',
    description: 'Asking questions naturally using 咩、邊、點、幾多 and common patterns.'
  },
  {
    slug: 'time',
    title: 'Time & Timing',
    description: 'Talking about now, later, schedules, and making plans with others.'
  },
  {
    slug: 'money',
    title: 'Money & Prices',
    description: 'Talking about prices, money, quantities, and costs in daily life.'
  },
  {
    slug: 'food',
    title: 'Eating & Ordering Food',
    description: 'Ordering food, talking about meals, and deciding when to eat.'
  },
  {
    slug: 'weather',
    title: 'Weather & Conditions',
    description: 'Talking about the weather, temperature, and daily conditions.'
  },
  {
    slug: 'emotions',
    title: 'Feelings & Reactions',
    description: 'Expressing emotions, reactions, and how you feel in everyday situations.'
  },
  {
    slug: 'travel',
    title: 'Getting Around',
    description: 'Directions, transport, and moving around the city with confidence.'
  },
  {
    slug: 'opinions',
    title: 'Opinions & Preferences',
    description: 'Saying what you think, like, want, or don’t like in natural Cantonese.'
  },
  {
    slug: 'problems',
    title: 'Problems & Fixes',
    description: 'Explaining problems, asking for help, and finding simple solutions.'
  },
  {
    slug: 'work',
    title: 'Work & Daily Routine',
    description: 'Talking about work, jobs, schedules, and everyday routines.'
  }
]


</script>

<template>
  <main class="max-w-3xl mx-auto py-12 px-4">
    <h1 class="text-3xl font-semibold mb-4">
      Modules
    </h1>

    <p class="text-gray-600 mb-8">
      Browse focused collections of spoken Cantonese patterns.
      Pick what’s useful to you.
    </p>

    <ul class="space-y-4">
      <li v-for="module in modules" :key="module.slug" class="border rounded p-4 hover:bg-gray-50">
        <NuxtLink :to="`/module/${module.slug}`" class="block">
          <div class="text-lg font-medium">
            {{ module.title }}
          </div>
          <div class="text-sm text-gray-600">
            {{ module.description }}
          </div>
        </NuxtLink>
      </li>
    </ul>
  </main>
</template>
