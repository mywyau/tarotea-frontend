<!-- components/ui/AppIcon.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { appIcons, type AppIconName } from '@/config/ui/icons'

const props = withDefaults(defineProps<{
  icon: AppIconName
  size?: string
}>(), {
  size: 'h-5 w-5',
})

const lucidePaths: Record<string, string> = {
  'lucide:house': '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>',
  'lucide:settings': '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.51a2 2 0 0 1 1-1.72l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  'lucide:x': '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  'lucide:arrow-left': '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
  'lucide:menu': '<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/>',
  'lucide:volume-2': '<path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>',
  'lucide:volume-x': '<path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="m22 9-6 6"/><path d="m16 9 6 6"/>',
  'lucide:user': '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  'lucide:user-round': '<circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/>',
  'lucide:circle-help': '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
  'lucide:calendar-check': '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="m9 16 2 2 4-4"/>',
  'lucide:audio-lines': '<path d="M2 10v3"/><path d="M6 6v11"/><path d="M10 3v18"/><path d="M14 8v7"/><path d="M18 5v13"/><path d="M22 10v3"/>',
  'lucide:mic': '<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><path d="M12 19v3"/>',
  'lucide:headphones': '<path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/>',
  'lucide:pencil-line': '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  'lucide:book-open': '<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>',
  'lucide:sparkles': '<path d="M9.94 14.5 8.5 18l-1.44-3.5L3.5 13l3.56-1.5L8.5 8l1.44 3.5L13.5 13z"/><path d="M17 3l1 2.5L20.5 6 18 7.5 17 10l-1-2.5L13.5 6 16 5.5z"/><path d="M19 15l.75 1.75L21.5 18l-1.75.75L19 20.5l-.75-1.75L16.5 18l1.75-1.25z"/>',
  'lucide:flame': '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 17c0-2.5 2-3 2-5a5 5 0 0 0-9 3 8 8 0 1 0 16 0c0-5-4-8-4-12-2.5 2-4 4.5-4 8"/>',
  'lucide:trophy': '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>',
  'lucide:lock-keyhole': '<circle cx="12" cy="16" r="1"/><rect x="3" y="10" width="18" height="12" rx="2"/><path d="M7 10V7a5 5 0 0 1 10 0v3"/>',
  'lucide:unlock-keyhole': '<circle cx="12" cy="16" r="1"/><rect x="3" y="10" width="18" height="12" rx="2"/><path d="M7 10V7a5 5 0 0 1 9.33-2.5"/>',
  'lucide:key-round': '<path d="M2.59 14.59a2 2 0 0 0 0 2.82l4 4a2 2 0 0 0 2.82 0l7.88-7.88A6 6 0 1 0 10.47 6.7z"/><circle cx="16.5" cy="7.5" r=".5"/>',
  'lucide:target': '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  'lucide:layers': '<path d="m12.83 2.18 8 4a1 1 0 0 1 0 1.79l-8 4a1.86 1.86 0 0 1-1.66 0l-8-4a1 1 0 0 1 0-1.79l8-4a1.86 1.86 0 0 1 1.66 0Z"/><path d="m22 12-9.17 4.59a1.86 1.86 0 0 1-1.66 0L2 12"/><path d="m22 17-9.17 4.59a1.86 1.86 0 0 1-1.66 0L2 17"/>',
  'lucide:tags': '<path d="M13.17 2H5a2 2 0 0 0-2 2v8.17a2 2 0 0 0 .59 1.42l7.58 7.58a2 2 0 0 0 2.83 0L21.17 14a2 2 0 0 0 0-2.83L14.59 4.59A2 2 0 0 0 13.17 2Z"/><path d="M8 7h.01"/><path d="m13 5 6 6"/>',
  'lucide:chart-no-axes-column-increasing': '<path d="M5 21V10"/><path d="M12 21V6"/><path d="M19 21V3"/>',
  'lucide:circle-check': '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  'lucide:triangle-alert': '<path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  'lucide:circle-x': '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>',
  'lucide:info': '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  'lucide:smile': '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><path d="M9 9h.01"/><path d="M15 9h.01"/>',
  'lucide:party-popper': '<path d="M5.8 11.3 2 22l10.7-3.79"/><path d="M4 3h.01"/><path d="M22 8h.01"/><path d="M15 2h.01"/><path d="M22 20h.01"/><path d="m22 2-2.24.75a2.9 2.9 0 0 0-1.85 1.85L17.16 6.84"/><path d="m14 8 2 2"/><path d="m18 12 2 2"/><path d="m7.5 13.5 3 3"/>',
  'lucide:construction': '<path d="M2 6h20"/><path d="M2 18h20"/><path d="M6 6v12"/><path d="M18 6v12"/><path d="m6 6 12 12"/><path d="m18 6-12 12"/>',
  'lucide:coffee': '<path d="M10 2v2"/><path d="M14 2v2"/><path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h11Z"/><path d="M16 8h2a3 3 0 1 1 0 6h-1"/><path d="M6 2v2"/>',
  'lucide:copy': '<rect width="13" height="13" x="9" y="9" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
}

const iconMarkup = computed(() => lucidePaths[appIcons[props.icon]] ?? lucidePaths['lucide:circle-help'])
</script>

<template>
  <svg
    :class="props.size"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    v-html="iconMarkup"
  />
</template>
