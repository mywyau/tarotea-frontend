<script setup lang="ts">

import { NuxtLink } from '#components';
import { masteryXp } from '@/config/xp/helpers';;
import { CheckCircle2 } from '@lucide/vue';

const props = defineProps<{
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
  tile.style.setProperty('--tile-drift-x', '0px')
  tile.style.setProperty('--tile-drift-y', '0px')
  tile.style.setProperty('--tile-drift-rotate', '0deg')
  tile.style.setProperty('--tile-scale', '1')
}

function startTileMovement(event: PointerEvent) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  const tile = event.currentTarget as HTMLElement
  const seed = `${props.word}-${props.jyutping}-${props.meaning}`
  let hash = 0

  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  }

  const xDirection = hash % 2 === 0 ? 1 : -1
  const yDirection = hash % 3 === 0 ? 1 : -1
  const rotateDirection = hash % 5 === 0 ? 1 : -1
  const driftX = xDirection * (10 + (hash % 7))
  const driftY = yDirection * (6 + (hash % 5))
  const driftRotate = rotateDirection * (4 + (hash % 4))

  tile.style.setProperty('--tile-drift-x', `${driftX}px`)
  tile.style.setProperty('--tile-drift-y', `${driftY}px`)
  tile.style.setProperty('--tile-drift-rotate', `${driftRotate}deg`)
  tile.style.setProperty('--tile-scale', '1.055')
  moveTileWithPointer(event)
}

function moveTileWithPointer(event: PointerEvent) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  const tile = event.currentTarget as HTMLElement
  const rect = tile.getBoundingClientRect()
  const pointerX = (event.clientX - rect.left) / rect.width - 0.5
  const pointerY = (event.clientY - rect.top) / rect.height - 0.5
  const maxShift = 18
  const maxRotate = 12

  tile.style.setProperty('--tile-x', `${pointerX * maxShift}px`)
  tile.style.setProperty('--tile-y', `${pointerY * maxShift}px`)
  tile.style.setProperty('--tile-rotate-x', `${pointerY * -maxRotate}deg`)
  tile.style.setProperty('--tile-rotate-y', `${pointerX * maxRotate}deg`)
}

</script>

<template>
  <component :is="to ? NuxtLink : 'div'" :to="to" class="relative word-tile hover:brightness-110"
    @pointerenter="startTileMovement" @pointermove="moveTileWithPointer" @pointerleave="resetTileMovement"
    @pointercancel="resetTileMovement" @blur="resetTileMovement">
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
  --tile-drift-x: 0px;
  --tile-drift-y: 0px;
  --tile-drift-rotate: 0deg;
  --tile-scale: 1;

  transform:
    perspective(700px)
    translate3d(
      calc(var(--tile-drift-x) + var(--tile-x)),
      calc(var(--tile-drift-y) + var(--tile-y)),
      0
    )
    rotateX(var(--tile-rotate-x))
    rotateY(var(--tile-rotate-y))
    rotateZ(var(--tile-drift-rotate))
    scale(var(--tile-scale));
  transform-style: preserve-3d;
  will-change: transform;
  transition:
    transform 0.64s cubic-bezier(0.18, 0.89, 0.32, 1.28),
    box-shadow 0.28s ease,
    filter 0.28s ease;
}


/* Hover lift */
.word-tile:hover {
  box-shadow: 0 22px 44px rgba(0, 0, 0, 0.14);
}

/* Active press */
.word-tile:active {
  transform:
    perspective(700px)
    translate3d(
      calc(var(--tile-drift-x) + var(--tile-x)),
      calc(var(--tile-drift-y) + var(--tile-y)),
      0
    )
    rotateX(var(--tile-rotate-x))
    rotateY(var(--tile-rotate-y))
    rotateZ(var(--tile-drift-rotate))
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
