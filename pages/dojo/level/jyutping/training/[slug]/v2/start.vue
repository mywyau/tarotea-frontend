<script setup lang="ts">
definePageMeta({
  ssr: false,
})

import { jyutpingXp, jyutpingXpHintUsed } from '~/config/dojo/xp_config'
import { levelTitles } from '~/utils/levels/levels'

const route = useRoute()
const slug = computed(() => route.params.slug as string)
</script>

<template>
  <DojoStartPage theme="purple" :heading="levelTitles[slug] ?? slug"
    description="Type the Jyutping for each Chinese word. Build speed and consistency."
    :start-to="`/typing-practice/level/jyutping/training/${slug}`" start-label="Start exercise" :xp-rules="[
      { action: 'No hint used', xp: `+${jyutpingXp} XP` },
      { action: 'Hint used', xp: `+${jyutpingXpHintUsed} XP` },
      { action: 'Unlimited retries', xp: 'check the hint if you are stuck' }
    ]" :keyboard-setup-tips="[
      'Set up or change to an English keyboard.',
    ]" :tips="[
      'We skip tone typing for smoother flow and to help with recognising part of the word sound shape.',
      'Hints reveal Jyutping and reduce XP for that word, so save hints for tougher words.',
      'You can type without spaces and keep moving — speed + repetition helps lock patterns in.'
    ]" />
</template>
