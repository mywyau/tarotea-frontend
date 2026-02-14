<script setup lang="ts">
defineProps<{
  to: string
  word: string
  jyutping: string
  meaning: string
  xp?: number
}>()

const MASTERY_XP = 1000


</script>

<template>
  <NuxtLink :to=to external class="border rounded-lg p-4 hover:bg-gray-50 transition space-y-1">
    <div class="text-xl text-center">
      {{ word }}
    </div>
    <div class="text-sm text-gray-400 text-center">
      {{ jyutping }}
    </div>
    <div class="text-xs text-gray-500 text-center">
      {{ meaning }}
    </div>

    <div class="text-xs text-gray-500 mt-2">
      {{ xp ?? 0 }} XP
    </div>

    <div class="w-full h-1 bg-gray-200 rounded mt-2">
      <div class="h-1 bg-green-500 rounded" :style="{ width: Math.min((xp ?? 0) / MASTERY_XP * 100, 100) + '%' }" />
    </div>
  </NuxtLink>
</template>
