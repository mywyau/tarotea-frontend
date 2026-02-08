<script setup lang="ts">

// app.vue
useHead({
  titleTemplate: (titleChunk) =>
    titleChunk ? `${titleChunk} · TaroTea` : 'TaroTea · Learn Cantonese',

  meta: [
    {
      name: 'description',
      content: 'Learn Cantonese with high quality audio, Jyutping, and real-life sentences.',
    },
    { name: 'application-name', content: 'TaroTea' },
    { name: 'apple-mobile-web-app-title', content: 'TaroTea' },
    { name: 'theme-color', content: '#c4b5fd' }
  ],
  link: [
    { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
    { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
    { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' },
    { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
    { rel: 'manifest', href: '/site.webmanifest' }
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
