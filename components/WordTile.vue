<script setup lang="ts">
defineProps<{
  to: string
  word: string
  jyutping: string
  meaning: string
  xp?: number
  mastered?: boolean
}>()

const MASTERY_XP = 1000

</script>

<template>
  <NuxtLink :to="to" external class="relative border rounded-lg p-4 hover:bg-gray-50 transition space-y-1">

    <!-- ✅ Mastered badge -->
    <div v-if="mastered" class="absolute top-2 right-2 text-[10px] px-2 py-0.5 text-emerald-700 font-medium">
      ✓
    </div>

    <div class="text-xl text-center">
      {{ word }}
    </div>

    <div class="text-sm text-gray-400 text-center">
      {{ jyutping }}
    </div>

    <div class="text-xs text-gray-500 text-center">
      {{ meaning }}
    </div>

    <div class="text-xs text-gray-500 mt-2 text-center">
      {{ xp ?? 0 }} XP
    </div>

    <div class="w-full h-1 bg-gray-200 rounded mt-2">
      <div class="h-1 bg-green-500 rounded transition-all duration-500"
        :style="{ width: Math.min((xp ?? 0) / MASTERY_XP * 100, 100) + '%' }" />
    </div>

  </NuxtLink>
</template>
