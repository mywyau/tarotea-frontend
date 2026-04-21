<script setup lang="ts">
definePageMeta({
  ssr: false,
  middleware: ['logged-in'],
})

import { chineseSentenceXp, chineseSentenceXpHintUsed } from '~/config/dojo/xp_config'
import { levelIdToNumbers } from '~/utils/levels/levels'

const route = useRoute()
const slug = computed(() => route.params.slug as string)

const levelNumber = computed(() => levelIdToNumbers(slug.value) ?? slug.value)
</script>

<template>
  <DojoStartPage :heading="`Level ${levelNumber} · Sentence dojo`"
    description="Fill in missing Chinese words in sentence context to sharpen practical usage and recognition."
    :start-to="`/dojo/level/sentences/chinese/${slug}/v2`" start-label="Start sentence exercise" :xp-rules="[
      { action: 'Correct answer (no hint)', xp: `+${chineseSentenceXp} XP` },
      { action: 'Correct answer (hint used)', xp: `+${chineseSentenceXpHintUsed} XP` },
      { action: 'Wrong answer', xp: '0 XP (retry until correct)' }
    ]" :keyboard-setup-tips="[
      'Set up or change to a Chinese based keyboard.',
    ]" :tips="[
      'You must answer in Chinese. Make sure the keyboard board is setup appropriately.',
      'Read the whole sentence first before typing for better context clues.',
      'Use hints when stuck — hint usage lowers XP for that item. But you learn faster from failure and seeing the jyutping sooner',
      'Focus on accuracy first, then speed as sentence patterns become familiar.'
    ]" />
</template>
