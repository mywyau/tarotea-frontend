<script setup lang="ts">
defineProps<{
  word: string
  jyutping: string
  meaning: string
}>()
</script>

<template>
  <NuxtLink
    :to="`/word/${word}`"
    class="border rounded-lg p-4 hover:bg-gray-50 transition space-y-1"
  >
    <div class="text-xl text-center">
      {{ word }}
    </div>
    <div class="text-sm text-gray-400 text-center">
      {{ jyutping }}
    </div>
    <div class="text-xs text-gray-500 text-center">
      {{ meaning }}
    </div>
  </NuxtLink>
</template>
