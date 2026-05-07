<script setup lang="ts">
import { Analytics } from '@vercel/analytics/vue';

const runtimeConfig = useRuntimeConfig()
const { initialiseTheme } = useThemeMode()

if (import.meta.client) {
  initialiseTheme()
}

const baseUrl = (runtimeConfig.public.siteUrl || 'http://localhost:3000').replace(/\/$/, '')

useHead({
  link: [
    {
      rel: 'canonical',
      href: `${baseUrl}/`,
    },
  ],
})

useSeoMeta({
  ogUrl: `${baseUrl}/`,
  ogTitle: 'TaroTea · Learn Cantonese',
  ogDescription: 'Learn natural Cantonese with exercises, vocabulary, audio and quizzes.',
  twitterTitle: 'TaroTea · Learn Cantonese',
  twitterDescription: 'Learn natural Cantonese with exercises, vocabulary, audio and quizzes.',
})

</script>

<template>
  <div class="tarotea-app-shell min-h-screen flex flex-col overflow-x-hidden">
    <BlankNavBar />

    <main class="flex-1">
      <ClientOnly>
        <Analytics />
      </ClientOnly>
      <NuxtPage />
    </main>

    <AppFooter />
  </div>
</template>
