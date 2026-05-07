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


</script>

<template>
  <component :is="to ? NuxtLink : 'div'" :to="to" class="relative word-tile hover:brightness-110">
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
  isolation: isolate;
  overflow: hidden;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.5);
  padding: 1.2rem;
  text-align: center;
  backdrop-filter: blur(12px) saturate(140%);
  -webkit-backdrop-filter: blur(12px) saturate(140%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.6),
    inset 0 -18px 40px rgba(255, 255, 255, 0.14),
    0 8px 20px rgba(0, 0, 0, 0.05);
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease;
}

.word-tile::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  border-radius: inherit;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.55), rgba(255, 255, 255, 0.12) 46%, rgba(255, 255, 255, 0.28)),
    radial-gradient(circle at 18% 12%, rgba(255, 255, 255, 0.72), transparent 34%);
  pointer-events: none;
}

.word-tile > * {
  position: relative;
  z-index: 1;
}

.word-tile::after {
  content: '';
  position: absolute;
  top: 0.45rem;
  left: 0.55rem;
  right: 38%;
  height: 1px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.72);
  pointer-events: none;
}

/* Hover lift */
.word-tile:hover {
  transform: translateY(-2px);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.68),
    inset 0 -18px 40px rgba(255, 255, 255, 0.18),
    0 14px 28px rgba(0, 0, 0, 0.08);
}

/* Active press */
.word-tile:active {
  transform: translateY(0px) scale(0.98);
}
</style>
