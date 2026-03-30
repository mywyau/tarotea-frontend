<script setup lang="ts">
const props = withDefaults(defineProps<{
  fallback?: string
  label?: string
}>(), {
  fallback: '/',
  label: 'Back',
})

const goBack = useGoBack(props.fallback)
</script>

<template>
  <button
    type="button"
    class="text-sm text-black hover:underline bg-transparent border-0 p-0 cursor-pointer"
    @click="goBack"
  >
    ← {{ label }}
  </button>
</template>