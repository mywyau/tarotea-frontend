<script setup lang="ts">
import { Analytics } from '@vercel/analytics/vue'
import { isFocusedLearningPath } from '~/utils/navigation/focusMode'

const route = useRoute()

const focusMode = computed(() => isFocusedLearningPath(route.path))

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
  <div class="app-shell" :class="{ 'app-shell-focus': focusMode }">
    <BlankNavBar :focus-mode="focusMode" />

    <main class="app-main">
      <ClientOnly>
        <Analytics />
      </ClientOnly>

      <NuxtPage />
    </main>

    <AppFooter v-if="!focusMode" />
  </div>
</template>

<style>
.app-shell {
  display: flex;
  min-height: 100vh;
  min-height: 100dvh;
  flex-direction: column;
  overflow-x: hidden;
  background: rgb(var(--color-canvas));
  color: rgb(var(--color-ink));
}

.app-main {
  flex: 1 1 auto;
  min-width: 0;
}

@media (max-width: 767px) {
  .app-shell:not(.app-shell-focus) {
    padding-bottom: calc(4.35rem + env(safe-area-inset-bottom, 0px));
  }
}
</style>
