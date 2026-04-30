<script setup lang="ts">

import { NuxtLink } from '#components';
import { masteryXp } from '@/config/xp/helpers';;

defineProps<{
  to?: string
  word: string
  jyutping: string
  meaning: string
  xp?: number
  mastered?: boolean
}>()

const clampProgress = (xp = 0) => Math.min((xp / masteryXp) * 100, 100)

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

      <div class="liquid-track">
        <div class="liquid-fill" :style="{ width: `${clampProgress(xp ?? 0)}%` }">
          <div class="liquid-wave wave-a" />
          <div class="liquid-wave wave-b" />
        </div>
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

.liquid-track {
  width: 100%;
  height: 0.38rem;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.4);
  overflow: hidden;
}

.liquid-fill {
  height: 100%;
  border-radius: inherit;
  position: relative;
  overflow: hidden;
  transition: width 500ms ease;
  background: linear-gradient(180deg, #22d3ee 0%, #10b981 100%);
}

.liquid-wave {
  position: absolute;
  left: -35%;
  width: 170%;
  height: 150%;
  top: -65%;
  border-radius: 43%;
  background: rgba(255, 255, 255, 0.4);
  transform-origin: center;
}

.wave-a {
  animation: swirl 3.5s linear infinite;
}

.wave-b {
  top: -58%;
  opacity: 0.6;
  border-radius: 40%;
  animation: swirl 5.5s linear reverse infinite;
}

@keyframes swirl {
  from {
    transform: translateX(0) rotate(0deg);
  }

  to {
    transform: translateX(-8%) rotate(360deg);
  }
}
</style>
