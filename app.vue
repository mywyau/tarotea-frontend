<script setup lang="ts">
import { Analytics } from '@vercel/analytics/vue';

const runtimeConfig = useRuntimeConfig()

const baseUrl = (runtimeConfig.public.siteUrl || 'http://localhost:3000').replace(/\/$/, '')
const route = useRoute()

const showQuizJingleMuteButton = computed(() => {
  const path = route.path

  return (
    path === '/quiz' ||
    path.startsWith('/quiz/') ||
    path.startsWith('/topic/quiz/') ||
    path.startsWith('/daily/') ||
    (path.startsWith('/dojo/') && path.includes('/training/'))
  )
})

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
  <div class="min-h-screen flex flex-col overflow-x-hidden bg-[#F6E1E1]/30">
    <BlankNavBar />

    <main class="flex-1">
      <ClientOnly>
        <Analytics />
      </ClientOnly>
      <NuxtPage />
      <ClientOnly>
        <QuizJingleMuteButton v-if="showQuizJingleMuteButton" />
      </ClientOnly>
    </main>

    <AppFooter />
  </div>
</template>
