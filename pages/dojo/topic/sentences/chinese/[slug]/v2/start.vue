<script setup lang="ts">
definePageMeta({
  ssr: false,
})

import { chineseSentenceXp, chineseSentenceXpHintUsed } from '~/config/dojo/xp_config'
import { sortedTopics } from '~/utils/topics/topics'

const route = useRoute()
const slug = computed(() => route.params.slug as string)

const topicTitle = computed(() =>
  sortedTopics.find(topic => topic.id === slug.value)?.title ?? slug.value
)
</script>

<template>
  <DojoStartPage :heading="`${topicTitle} · Sentence dojo`"
    description="Train with sentence fill-in prompts in this topic to practice words in realistic context."
    :start-to="`/dojo/topic/sentences/chinese/${slug}/v2`" start-label="Start sentence exercise" :xp-rules="[
      { action: 'Correct answer (no hint)', xp: `+${chineseSentenceXp} XP` },
      { action: 'Correct answer (hint used)', xp: `+${chineseSentenceXpHintUsed} XP` },
      { action: 'Wrong answer', xp: '0 XP (retry until correct)' }
    ]" :keyboard-setup-tips="[
      'Set up or change to a Chinese based keyboard.',
    ]" :tips="[
      'Use sentence context to predict likely words before typing.',
      'Hints are useful for blocked moments but reduce XP gained.',
      'Keep a steady pace — repeated sentence patterns will feel easier each run.'
    ]" />
</template>
