<script setup lang="ts">
definePageMeta({
  ssr: false,
  middleware: ['logged-in'],
})

import { jyutpingXp, jyutpingXpHintUsed } from '~/config/dojo/xp_config'
import { levelIdToNumbers } from '~/utils/levels/levels'

const route = useRoute()
const slug = computed(() => route.params.slug as string)

const levelNumber = computed(() => levelIdToNumbers(slug.value) ?? slug.value)
</script>

<template>
  <DojoStartPage
    :heading="`Level ${levelNumber} · Jyutping dojo`"
    description="Type the Jyutping for each Chinese word. Build speed and consistency across the full set."
    :start-to="`/dojo/level/jyutping/training/${slug}/v2`"
    start-label="Start jyutping exercise"
    :xp-rules="[
      { action: 'Correct answer (no hint)', xp: `+${jyutpingXp} XP` },
      { action: 'Correct answer (hint used)', xp: `+${jyutpingXpHintUsed} XP` },
      { action: 'Wrong answer', xp: '0 XP (retry until correct)' }
    ]"
    :keyboard-setup-tips="[
      'Set up a quick toggle to an English keyboard so number keys (1-6) are easy to type for tones.',
      'On mobile, keep the number row visible (or long-press access) before starting for smoother flow.'
    ]"
    :tips="[
      'Hints reveal Jyutping and reduce XP for that word, so save hints for tougher words.',
      'You can type without spaces and keep moving — speed + repetition helps lock patterns in.'
    ]"
  />
</template>
