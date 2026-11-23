<script setup lang="ts">
definePageMeta({
  ssr: false,
})

import { chineseSentenceXp, chineseSentenceXpHintUsed } from '~/config/dojo/xp_config'
import { levelTitles } from '~/utils/levels/levels'

const route = useRoute()
const slug = computed(() => route.params.slug as string)
</script>

<template>
  <DojoStartPage theme="blush" :heading="levelTitles[slug] ?? slug"
    description="Fill in missing Chinese words in sentence context to sharpen practical usage and recognition."
    :start-to="`/typing-practice/level/sentences/chinese/${slug}`" start-label="Start exercise" :xp-rules="[
      { action: 'No hint used', xp: `+${chineseSentenceXp} XP` },
      { action: 'Hint used', xp: `+${chineseSentenceXpHintUsed} XP` },
      { action: 'Unlimited retries', xp: 'check the hint if you are stuck' }
    ]" :keyboard-setup-tips="[
      'Set up or change to a Chinese based keyboard.',
    ]" :tips="[
      'Read the whole sentence first before typing for better context clues.',
      'Use hints when stuck — hint usage lowers XP for that sentence.',
      'Focus on accuracy first, then speed as sentence patterns become familiar.'
    ]" />
</template>
