<script setup lang="ts">
definePageMeta({
  ssr: false,
})

import { chineseXp, chineseXpHintUsed } from '~/config/dojo/xp_config'
import { levelTitles } from '~/utils/levels/levels'

const route = useRoute()
const slug = computed(() => route.params.slug as string)
</script>

<template>
  <DojoStartPage :heading="levelTitles[slug] ?? slug"
    description="Type the Chinese. Great for character recall and typing fluency."
    :start-to="`/typing-practice/level/chinese/training/${slug}`" start-label="Start exercise" :xp-rules="[
      { action: 'No hint used', xp: `+${chineseXp} XP` },
      { action: 'Hint used', xp: `+${chineseXpHintUsed} XP` },
      { action: 'Unlimited retries', xp: 'check the hint if you are stuck' }
    ]" :keyboard-setup-tips="[
      'Set up or change to a Chinese based keyboard.',
    ]" :tips="[
      'Hints reveal Jyutping and reduce XP for that word, so use them strategically.',
      'Try to answer before checking hints to maximize XP and retention.'
    ]" />
</template>
