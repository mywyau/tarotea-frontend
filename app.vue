<script setup lang="ts">
import { Analytics } from '@vercel/analytics/vue'

const route = useRoute()

const showBackLink = computed(() => route.path !== '/')
const appBackLinkTo = computed(() => {
  const path = route.path

  if (path.startsWith('/level/') && path.includes('/word/')) {
    const levelSlug = route.params.slug
    const wordId = route.params.id

    if (typeof levelSlug === 'string' && typeof wordId === 'string') {
      return `/level/${levelSlug}/v2#${decodeURIComponent(wordId)}`
    }
  }

  if (path.startsWith('/topic/word/')) {
    const topicSlug = route.params.topic
    const wordSlug = route.params.slug

    if (typeof topicSlug === 'string' && typeof wordSlug === 'string') {
      return `/topic/words/${topicSlug}/v2#${decodeURIComponent(wordSlug)}`
    }
  }

  return undefined
})

const runtimeConfig = useRuntimeConfig()

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
  <div class="min-h-screen flex flex-col overflow-x-hidden bg-[#F6E1E1]/30">
    <BlankNavBar />

    <BackLink
      v-if="showBackLink"
      :to="appBackLinkTo"
      class="mt-10"
    />

    <main class="flex-1">
      <ClientOnly>
        <Analytics />
      </ClientOnly>

      <NuxtPage />
    </main>

    <AppFooter />
  </div>
</template>
