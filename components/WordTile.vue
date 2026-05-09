<script setup lang="ts">

import { NuxtLink } from '#components';
import { masteryXp } from '@/config/xp/helpers';
import { CheckCircle2 } from '@lucide/vue';
import { computed, type CSSProperties } from 'vue';

const props = defineProps<{
  to?: string
  word: string
  jyutping: string
  meaning: string
  xp?: number
  mastered?: boolean
}>()

const hashString = (value: string) => {
  let hash = 0

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }

  return hash
}

const playfulMotionStyle = computed<CSSProperties>(() => {
  const hash = hashString(`${props.word}-${props.jyutping}-${props.meaning}`)
  const axis = hash % 3
  const amplitude = 2 + (hash % 5)
  const duration = 3.2 + ((hash >> 3) % 18) / 10
  const delay = -(((hash >> 7) % 32) / 10)
  const direction = (hash >> 5) % 2 === 0 ? 1 : -1

  const floatX = axis === 1
    ? amplitude * direction
    : axis === 2
      ? Math.max(1, amplitude - 2) * direction
      : 0
  const floatY = axis === 0
    ? amplitude * direction
    : axis === 2
      ? amplitude * -direction
      : 0

  return {
    '--tile-float-x': `${floatX}px`,
    '--tile-float-y': `${floatY}px`,
    '--tile-float-x-soft': `${floatX * 0.65}px`,
    '--tile-float-y-soft': `${floatY * -0.35}px`,
    '--tile-float-x-return': `${floatX * -0.45}px`,
    '--tile-float-y-return': `${floatY * 0.55}px`,
    '--tile-float-duration': `${duration}s`,
    '--tile-float-delay': `${delay}s`,
  } as CSSProperties
})

</script>

<template>
  <component :is="to ? NuxtLink : 'div'" :to="to" class="relative word-tile hover:brightness-110"
    :style="playfulMotionStyle">
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
  --tile-hover-x: 0px;
  --tile-hover-y: 0px;
  --tile-press-scale: 1;

  animation: tile-playful-float var(--tile-float-duration, 4s) ease-in-out infinite;
  animation-delay: var(--tile-float-delay, 0s);
  transform-origin: center;
  transition: box-shadow 0.15s ease, filter 0.15s ease;
  will-change: transform;
}

/* Hover lift */
.word-tile:hover {
  --tile-hover-y: -2px;

  box-shadow: 0 14px 28px rgba(0, 0, 0, 0.08);
}

/* Active press */
.word-tile:active {
  --tile-hover-y: 0px;
  --tile-press-scale: 0.98;
}

@keyframes tile-playful-float {
  0%,
  100% {
    transform: translate3d(var(--tile-hover-x), var(--tile-hover-y), 0) scale(var(--tile-press-scale));
  }

  25% {
    transform: translate3d(
      calc(var(--tile-hover-x) + var(--tile-float-x-soft)),
      calc(var(--tile-hover-y) + var(--tile-float-y-soft)),
      0
    ) scale(var(--tile-press-scale));
  }

  50% {
    transform: translate3d(
      calc(var(--tile-hover-x) + var(--tile-float-x)),
      calc(var(--tile-hover-y) + var(--tile-float-y)),
      0
    ) scale(var(--tile-press-scale));
  }

  75% {
    transform: translate3d(
      calc(var(--tile-hover-x) + var(--tile-float-x-return)),
      calc(var(--tile-hover-y) + var(--tile-float-y-return)),
      0
    ) scale(var(--tile-press-scale));
  }
}

@media (prefers-reduced-motion: reduce) {
  .word-tile {
    animation: none;
    will-change: auto;
  }
}
</style>
