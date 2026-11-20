<script setup lang="ts">
useLearningPageSeo(
  'Cantonese typing practice',
  'Practise typing Cantonese characters and Jyutping with word and sentence exercises organised by level or topic.',
)

import { Layers, Tags } from '@lucide/vue'



definePageMeta({
  ssr: true
})

</script>

<template>
  <main class="dojo-home max-w-3xl mx-auto py-20 px-6 space-y-10">



    <header class="text-center space-y-4">
      <h1 class="text-3xl sm:text-4xl font-semibold text-black dojo-heading">Typing practice</h1>
      <p class="text-gray-700 max-w-lg mx-auto dojo-subheading">
        Practise typing Cantonese characters and Jyutping.
      </p>
    </header>

    <!-- Training Options -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6">

      <!-- Level Training -->
      <NuxtLink to="/typing-practice/level" class="block rounded-2xl">
        <AppCard tone="lilac" padding="generous" interactive class="relative h-full">
          <div class="space-y-3 dojo-tile-copy">
            <div class="dojo-tile-header">
              <div class="text-xl font-semibold text-black">
                Levels
              </div>

              <span class="dojo-tile-icon-wrap" role="img" aria-label="Levels">
                <Layers class="dojo-tile-icon" aria-hidden="true" />
              </span>
            </div>
            <p class="text-sm text-gray-900/80">
              Choose a level to practise words and sentences.
            </p>
          </div>
        </AppCard>
      </NuxtLink>

      <!-- Topic Training -->
      <NuxtLink to="/typing-practice/topic" class="block rounded-2xl">
        <AppCard tone="blue" padding="generous" interactive class="relative h-full">
          <div class="space-y-3 dojo-tile-copy">
            <div class="dojo-tile-header">
              <div class="text-xl font-semibold text-black">
                Topics
              </div>

              <span class="dojo-tile-icon-wrap" role="img" aria-label="Topics">
                <Tags class="dojo-tile-icon" aria-hidden="true" />
              </span>
            </div>
            <p class="text-sm text-gray-900/80">
              Choose a topic to practise its vocabulary.
            </p>
          </div>
        </AppCard>
      </NuxtLink>
    </div>

  </main>
</template>

<style scoped>
main {
  min-height: 60vh;
}


.dojo-heading {
  font-size: 1.3rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(0, 0, 0);
}

.dojo-subheading {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(17, 24, 39, 0.65);
}


.dojo-tile-copy {
  padding-right: 2.25rem;
}

.dojo-tile-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.dojo-tile-icon-wrap {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #374151;
}

.dojo-tile-icon {
  width: 1.65rem;
  height: 1.65rem;
  stroke-width: 2.35;
}


</style>
