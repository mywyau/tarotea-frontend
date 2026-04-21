<script setup lang="ts">
definePageMeta({
  ssr: false,
  middleware: ['logged-in'],
})

import { chineseXp, chineseXpHintUsed } from '~/config/dojo/xp_config'
import { sortedTopics } from '~/utils/topics/topics'

const route = useRoute()
const slug = computed(() => route.params.slug as string)

const topicTitle = computed(() =>
  sortedTopics.find(topic => topic.id === slug.value)?.title ?? slug.value
)
</script>

<template>
  <DojoStartPage :heading="`${topicTitle} · Chinese dojo`"
    description="Type Chinese words from this topic based on meanings to strengthen practical recall."
    :start-to="`/dojo/topic/chinese/training/${slug}/v2`" start-label="Start chinese exercise" :xp-rules="[
      { action: 'Correct answer (no hint)', xp: `+${chineseXp} XP` },
      { action: 'Correct answer (hint used)', xp: `+${chineseXpHintUsed} XP` },
      { action: 'Wrong answer', xp: '0 XP (retry until correct)' }
    ]" :keyboard-setup-tips="[
      'Set up or change to a Chinese based keyboard.',
    ]" :tips="[
      'Listen to word audio whenever available to link meaning, sound, and character form.',
      'Hints can speed up a run, but they reduce XP for that answer.',
      'Aim for complete sessions to reinforce a full topic in one pass and to be awarded the xp.'
    ]" />
</template>
