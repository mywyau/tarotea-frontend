<script setup lang="ts">
import { Analytics } from '@vercel/analytics/vue'

const route = useRoute()

const showBackLink = computed(() => route.path !== '/')

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

<style>
:root {
  --dojo-panel-pattern: url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%22220%22%20height%3D%22120%22%20viewBox%3D%220%200%20220%20120%22%3E%0A%20%20%3Cg%20fill%3D%22%231f2937%22%20opacity%3D%22.055%22%20font-family%3D%22Arial%2C%20sans-serif%22%20font-weight%3D%22700%22%3E%0A%20%20%20%20%3Ctext%20x%3D%2212%22%20y%3D%2234%22%20font-size%3D%2218%22%3Eaa1%3C/text%3E%0A%20%20%20%20%3Ctext%20x%3D%2274%22%20y%3D%2226%22%20font-size%3D%2214%22%3Ejyut6%3C/text%3E%0A%20%20%20%20%3Ctext%20x%3D%22145%22%20y%3D%2238%22%20font-size%3D%2222%22%3E%E7%B2%B5%3C/text%3E%0A%20%20%20%20%3Ctext%20x%3D%22178%22%20y%3D%2228%22%20font-size%3D%2214%22%3E%E2%8C%98%3C/text%3E%0A%20%20%20%20%3Ctext%20x%3D%2222%22%20y%3D%2276%22%20font-size%3D%2215%22%3Engo5%3C/text%3E%0A%20%20%20%20%3Ctext%20x%3D%2286%22%20y%3D%2272%22%20font-size%3D%2224%22%3E%E6%89%93%E5%AD%97%3C/text%3E%0A%20%20%20%20%3Ctext%20x%3D%22163%22%20y%3D%2282%22%20font-size%3D%2215%22%3Etype%3C/text%3E%0A%20%20%20%20%3Ctext%20x%3D%2242%22%20y%3D%22110%22%20font-size%3D%2217%22%3Ezik1%3C/text%3E%0A%20%20%20%20%3Ctext%20x%3D%22124%22%20y%3D%22108%22%20font-size%3D%2214%22%3Espace%3C/text%3E%0A%20%20%20%20%3Ctext%20x%3D%22184%22%20y%3D%22112%22%20font-size%3D%2218%22%3E%E2%86%B5%3C/text%3E%0A%20%20%3C/g%3E%0A%3C/svg%3E");
}

.dojo-activity-panel {
  position: relative;
  isolation: isolate;
  overflow: hidden;
}

.dojo-activity-panel::before {
  content: '';
  position: absolute;
  inset: -45%;
  z-index: 0;
  pointer-events: none;
  background-image: var(--dojo-panel-pattern);
  background-size: 220px 120px;
  opacity: 0.75;
  transform: rotate(-18deg);
  transform-origin: center;
}

.dojo-activity-panel > * {
  position: relative;
  z-index: 1;
}
</style>
