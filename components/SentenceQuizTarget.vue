<script setup lang="ts">
import { masteryXp } from '~/config/xp/helpers'

defineProps<{
  answered: boolean
  word: string
  jyutping: string
  xp: number
  xpDelta: number | null
  streak: number
}>()
</script>

<template>
  <div class="sentence-quiz-target flex min-h-[4.75rem] flex-col items-center justify-center gap-1 text-center">
    <div v-if="answered" class="space-y-0.5">
      <p class="text-[0.65rem] uppercase tracking-wide text-gray-500">Target word</p>
      <p lang="zh-HK" class="text-lg font-semibold leading-tight">{{ word }}</p>
      <p class="text-xs text-gray-600">{{ jyutping }}</p>
    </div>
    <div v-else aria-hidden="true" class="select-none text-xl font-semibold leading-tight text-gray-500 blur-[4px]">●●</div>

    <div class="flex items-center justify-center gap-2" :class="{ 'blur-[3px] select-none': !answered }"
      :aria-hidden="!answered">
      <div class="h-1.5 w-28 overflow-hidden rounded-full bg-gray-200">
        <div class="h-full rounded-full bg-green-500" :style="{ width: answered ? Math.min(xp / masteryXp * 100, 100) + '%' : '45%' }" />
      </div>
      <span v-if="answered" class="relative text-xs text-gray-600">
        {{ xp }} / {{ masteryXp }} XP
        <Transition name="xp-fall">
          <span v-if="xpDelta !== null" class="absolute left-full ml-2 font-semibold"
            :class="xpDelta > 0 ? 'text-green-600' : 'text-red-600'">{{ xpDelta > 0 ? '+' : '' }}{{ xpDelta }}</span>
        </Transition>
      </span>
      <span v-else class="h-2 w-12 rounded-full bg-gray-400" />
    </div>
    <span v-if="answered && streak > 0" class="text-xs text-orange-500">{{ streak }} streak</span>
  </div>
</template>

<style scoped>
.xp-fall-enter-active {
  transition: transform 0.6s ease, opacity 0.6s ease;
}

.xp-fall-leave-active {
  transition: transform 0.4s ease, opacity 0.4s ease;
}

.xp-fall-enter-from {
  opacity: 0;
  transform: translateY(-10px) scale(0.9);
}

.xp-fall-enter-to {
  opacity: 1;
  transform: translateY(0px) scale(1);
}

.xp-fall-leave-to {
  opacity: 0;
  transform: translateY(35px) scale(0.95);
}
</style>
