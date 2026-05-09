<script setup lang="ts">

import { NuxtLink } from '#components';
import { masteryXp } from '@/config/xp/helpers';;
import { CheckCircle2 } from '@lucide/vue';

defineProps<{
  to?: string
  word: string
  jyutping: string
  meaning: string
  xp?: number
  mastered?: boolean
}>()

function resetTileMovement(event: Event) {
  const tile = event.currentTarget as HTMLElement

  tile.style.setProperty('--tile-x', '0px')
  tile.style.setProperty('--tile-y', '0px')
  tile.style.setProperty('--tile-rotate-x', '0deg')
  tile.style.setProperty('--tile-rotate-y', '0deg')
}

function moveTileWithPointer(event: PointerEvent) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  const tile = event.currentTarget as HTMLElement
  const rect = tile.getBoundingClientRect()
  const pointerX = (event.clientX - rect.left) / rect.width - 0.5
  const pointerY = (event.clientY - rect.top) / rect.height - 0.5
  const maxShift = 7
  const maxRotate = 4

  tile.style.setProperty('--tile-x', `${pointerX * maxShift}px`)
  tile.style.setProperty('--tile-y', `${pointerY * maxShift}px`)
  tile.style.setProperty('--tile-rotate-x', `${pointerY * -maxRotate}deg`)
  tile.style.setProperty('--tile-rotate-y', `${pointerX * maxRotate}deg`)
}

</script>

<template>
  <component :is="to ? NuxtLink : 'div'" :to="to" class="relative word-tile hover:brightness-110"
    @pointermove="moveTileWithPointer" @pointerleave="resetTileMovement" @pointercancel="resetTileMovement"
    @blur="resetTileMovement">
    <!-- Mastered badge -->
    <div v-if="mastered" class="absolute top-2 right-2 text-emerald-600" aria-label="Mastered">
      <CheckCircle2 class="h-4 w-4" aria-hidden="true" />
    </div>

    <div class="text-xl text-center">
      {{ word }}
    </div>

    <div class="text-sm text-black text-center">
      {{ jyutping }}
    </div>

    <div class="text-xs text-black text-center">
      {{ meaning }}
    </div>

    <div class="mt-5 space-y-1">
      <div class="text-[11px] text-black text-center">
        {{ xp ?? 0 }} XP
      </div>

      <div class="w-full h-1 bg-gray-400 rounded">
        <div class="h-1 bg-green-500 rounded transition-all duration-500"
          :style="{ width: Math.min((xp ?? 0) / masteryXp * 100, 100) + '%' }" />
      </div>
    </div>
  </component>
</template>

<style scoped>
.progress-bar {
  background: linear-gradient(90deg,
      #D6A3D1,
      #EAB8E4);
}

.word-tile {
  border-radius: 14px;
  padding: 1.2rem;
  text-align: center;
  backdrop-filter: blur(6px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.05);
  --tile-x: 0px;
  --tile-y: 0px;
  --tile-rotate-x: 0deg;
  --tile-rotate-y: 0deg;

  transform:
    perspective(700px)
    translate3d(var(--tile-x), var(--tile-y), 0)
    rotateX(var(--tile-rotate-x))
    rotateY(var(--tile-rotate-y));
  transform-style: preserve-3d;
  will-change: transform;
  transition:
    transform 0.42s cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 0.25s ease,
    filter 0.25s ease;
}


/* Hover lift */
.word-tile:hover {
  box-shadow: 0 16px 32px rgba(0, 0, 0, 0.1);
}

/* Active press */
.word-tile:active {
  transform:
    perspective(700px)
    translate3d(var(--tile-x), var(--tile-y), 0)
    rotateX(var(--tile-rotate-x))
    rotateY(var(--tile-rotate-y))
    scale(0.98);
}

@media (prefers-reduced-motion: reduce) {
  .word-tile {
    transform: none;
    transition:
      box-shadow 0.2s ease,
      filter 0.2s ease;
  }
}
</style>
