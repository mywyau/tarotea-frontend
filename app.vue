<script setup lang="ts">
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
  ]
})

import { Analytics } from '@vercel/analytics/nuxt'

const { resolve } = useMeStateV2()
onMounted(() => resolve())
</script>

<template>
  <div
    class="min-h-screen flex flex-col overflow-x-hidden"
    style="
      background: linear-gradient(
        180deg,
        rgba(246,225,225,0.6) 0%,
        rgba(255,255,255,0.8) 50%,
        rgba(168,202,224,0.4) 100%
      );
    "
  >
    <BlankNavBar />

    <main class="flex-1 bg-transparent">
      <Analytics />
      <NuxtPage />
    </main>

    <AppFooter />
  </div>
</template>