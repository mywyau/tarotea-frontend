<script setup lang="ts">
import { isUtilityPage, searchUrl } from '~/utils/seo'
import { Analytics } from '@vercel/analytics/vue'
import { isFocusedLearningPath } from '~/utils/navigation/focusMode'

const route = useRoute()

const focusMode = computed(() => isFocusedLearningPath(route.path))
const quizFocusMode = computed(() => focusMode.value && (
  route.path.startsWith('/quiz/')
  || route.path.startsWith('/topic/quiz/')
  || route.path.startsWith('/daily/')
))

const canonical = computed(() => searchUrl(route.path))
const preview = useRuntimeConfig().public.isPreviewDeployment
useHead({
  title: () => typeof route.meta.title === 'string' ? route.meta.title : undefined,
  titleTemplate: title => title ? (/TaroTea$/i.test(title) ? title : `${title} · TaroTea`) : 'TaroTea · Learn Cantonese',
  link: [{ rel: 'canonical', href: canonical }],
})
useSeoMeta({
  ogUrl: canonical,
  robots: () => preview || isUtilityPage(route.path) ? 'noindex, follow' : undefined,
  ogImage: searchUrl('/android-chrome-512x512.png'),
  ogImageAlt: 'TaroTea',
  twitterCard: 'summary',
})
</script>

<template>
  <div class="app-shell" :class="{ 'app-shell-focus': focusMode, 'app-shell-quiz': quizFocusMode }">
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
