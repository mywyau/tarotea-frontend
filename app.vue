<script setup lang="ts">

// app.vue
useHead({
  titleTemplate: (titleChunk) =>
    titleChunk ? `${titleChunk} · TaroTea` : 'TaroTea · Learn Spoken Cantonese',

  meta: [
    {
      name: 'description',
      content:
        'Learn spoken Cantonese with high quality audio, Jyutping, and real-life sentences.'
    }
  ]
})

import { Analytics } from '@vercel/analytics/nuxt';

</script>

<template>
  <div class="min-h-screen flex flex-col overflow-x-hidden">
    <NavBar />
    <main class="flex-1">
      <Analytics />
      <NuxtPage />
    </main>
    <AppFooter />
  </div>
</template>
