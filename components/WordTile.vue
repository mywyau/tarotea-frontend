<script setup lang="ts">

import { NuxtLink } from '#components';
import { masteryXp } from '@/utils/xp /helpers';

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
    <div v-if="mastered" class="absolute top-2 right-2 text-[10px] px-2 py-0.5 text-emerald-600 font-medium">
      ✓
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
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease;
}

/* Hover lift */
.word-tile:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 28px rgba(0, 0, 0, 0.08);
}

/* Active press */
.word-tile:active {
  transform: translateY(0px) scale(0.98);
}
</style>