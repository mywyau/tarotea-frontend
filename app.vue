<script setup lang="ts">

import { Analytics } from '@vercel/analytics/nuxt'

</script>

<template>
  <div class="min-h-screen flex flex-col">
    <NavBar />
    <main class="flex-1">
      <Analytics />
      <NuxtPage />
    </main>
    <AppFooter />
  </div>
</template>
