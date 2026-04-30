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
          <div class="liquid-surface surface-a" />
          <div class="liquid-surface surface-b" />
          <div class="liquid-edge" />
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
  height: 0.5rem;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.3);
  overflow: hidden;
}

.liquid-fill {
  height: 100%;
  border-radius: inherit;
  position: relative;
  overflow: hidden;
  transition: width 500ms ease;
  background: linear-gradient(180deg, #4ade80 0%, #22c55e 45%, #16a34a 100%);
}

.liquid-surface {
  position: absolute;
  left: -120%;
  width: 240%;
  height: 95%;
  top: -72%;
  border-radius: 42% 58% 46% 54% / 62% 58% 42% 38%;
  background: rgba(255, 255, 255, 0.55);
}

.surface-a {
  opacity: 0.85;
  animation: flow-horizontal 4.3s linear infinite;
}

.surface-b {
  top: -66%;
  opacity: 0.45;
  border-radius: 48% 52% 58% 42% / 52% 48% 52% 48%;
  animation: flow-horizontal 6.2s linear infinite reverse;
}

.liquid-edge {
  position: absolute;
  top: -12%;
  right: -0.35rem;
  width: 0.9rem;
  height: 124%;
  border-radius: 999px;
  background:
    radial-gradient(100% 60% at 0% 50%, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0) 70%),
    linear-gradient(180deg, rgba(74, 222, 128, 0.95), rgba(22, 163, 74, 0.95));
  box-shadow: 0 0 0 1px rgba(34, 197, 94, 0.25);
  animation: edge-wave 1.5s ease-in-out infinite;
}

@keyframes flow-horizontal {
  from {
    transform: translateX(0);
  }

  to {
    transform: translateX(50%);
  }
}

@keyframes edge-wave {
  0%,
  100% {
    transform: translateY(0) scaleY(0.95);
  }

  50% {
    transform: translateY(-8%) scaleY(1.06);
  }
}
</style>
