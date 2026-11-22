<script setup lang="ts">
const visible = defineModel<boolean>({ required: true })
</script>

<template>
  <button type="button" role="switch" :aria-checked="visible"
    class="inline-flex min-h-8 items-center justify-between gap-3 rounded text-xs font-semibold text-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
    @click="visible = !visible">
    <slot />
    <span aria-hidden="true" class="inline-flex h-5 w-9 shrink-0 items-center rounded-full p-0.5"
      :class="visible ? 'bg-blue-700' : 'bg-gray-500'">
      <span class="h-4 w-4 rounded-full bg-white" :class="{ 'translate-x-4': visible }" />
    </span>
  </button>
</template>
