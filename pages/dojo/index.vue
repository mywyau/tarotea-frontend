<script setup lang="ts">
import { Layers, Tags } from '@lucide/vue'


definePageMeta({
  ssr: true
})

</script>

<template>
  <main class="dojo-home max-w-xl mx-auto py-20 px-6 space-y-10">



    <!-- Header -->
    <div class="text-center space-y-4">
      <TypewriterTitleBlock heading-text="Jyutping Dojo"
        subheading-text="Strengthen your Cantonese phonetic skills with some training."
        heading-class="text-3xl sm:text-4xl font-semibold text-black dojo-heading"
        subheading-class="text-gray-700 max-w-lg mx-auto dojo-subheading" />
    </div>

    <!-- Training Options -->
    <div class="grid grid-cols-1 gap-6 pt-6">

      <!-- Level Training -->
      <NuxtLink to="/dojo/level" class="dojo-tile dojo-tile-blue rounded-2xl p-8 shadow-sm hover:shadow-md transition
               hover:-translate-y-1 active:scale-[0.99]">
        <div class="space-y-3 dojo-tile-copy">
          <div class="dojo-tile-header">
            <div class="text-xl font-semibold text-black">
              Level Training
            </div>

            <span class="dojo-tile-icon-wrap" role="img" aria-label="Level training">
              <Layers class="dojo-tile-icon" aria-hidden="true" />
            </span>
          </div>
          <p class="text-sm text-gray-900/80">
            Practice by structured progression levels.
          </p>
        </div>
      </NuxtLink>

      <!-- Topic Training -->
      <NuxtLink to="/dojo/topic" class="dojo-tile dojo-tile-pink rounded-2xl p-8 shadow-sm hover:shadow-md transition
               hover:-translate-y-1 active:scale-[0.99]">
        <div class="space-y-3 dojo-tile-copy">
          <div class="dojo-tile-header">
            <div class="text-xl font-semibold text-black">
              Topic Training
            </div>

            <span class="dojo-tile-icon-wrap" role="img" aria-label="Topic training">
              <Tags class="dojo-tile-icon" aria-hidden="true" />
            </span>
          </div>
          <p class="text-sm text-gray-900/80">
            Train your phonetics by subject area.
          </p>
        </div>
      </NuxtLink>
    </div>

  </main>
</template>

<style scoped>
main {
  min-height: 60vh;
}

.dojo-home {
  --pink: #EAB8E4;
  --blue: #A8CAE0;
  --blush: #F6E1E1;
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

.dojo-tile {
  position: relative;
  color: #111827;
  border: 1px solid rgba(255, 255, 255, 0.45);
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

.dojo-tile-blue {
  background-color: rgba(168, 202, 224, 0.66);
}

.dojo-tile-pink {
  background-color: rgba(234, 184, 228, 0.66);
}
</style>
