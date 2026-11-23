<script setup lang="ts">
import { Eye, EyeOff } from '@lucide/vue'

const visible = defineModel<boolean>({ required: true })
const emit = defineEmits<{ reveal: [] }>()

function toggle() {
  if (!visible.value) emit('reveal')
  visible.value = !visible.value
}
</script>

<template>
  <button type="button" :aria-expanded="visible" @click="toggle"
    class="inline-flex items-center gap-1.5 text-xs text-gray-500 underline hover:text-gray-700">
    <component :is="visible ? EyeOff : Eye" class="h-4 w-4" aria-hidden="true" />
    {{ visible ? 'Hide Jyutping' : 'Show Jyutping (hint)' }}
  </button>
</template>
