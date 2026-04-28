<script setup lang="ts">
definePageMeta({
  ssr: false,
})

import { jyutpingXp, jyutpingXpHintUsed } from '~/config/dojo/xp_config'
import { sortedTopics } from '~/utils/topics/topics'

const route = useRoute()
const slug = computed(() => route.params.slug as string)
const { isLoggedIn } = useMeStateV2()

const topicTitle = computed(() =>
  sortedTopics.find(topic => topic.id === slug.value)?.title ?? slug.value
)
</script>

<template>
  <DojoStartPage :heading="`${topicTitle} · Jyutping dojo`"
    description="Type the Jyutping for words in this topic and build instant sound-to-spelling recall."
     :guest-note="isLoggedIn ? 'Signed in: XP from this run will be saved.' : 'Guest mode: XP from this run is preview only and will not be saved.'"
    :start-to="`/dojo/topic/jyutping/training/${slug}/v2`" :start-label="isLoggedIn ? 'Start jyutping exercise' : 'Start jyutping guest exercise'" :xp-rules="[
      { action: 'Correct answer (no hint)', xp: `+${jyutpingXp} XP` },
      { action: 'Correct answer (hint used)', xp: `+${jyutpingXpHintUsed} XP` },
      { action: 'Wrong answer', xp: '0 XP (retry until correct)' }
    ]" :keyboard-setup-tips="[
      'Keep an English keyboard active.',
    ]" :tips="[
      'Hinted answers still count but award lower XP than no-hint answers.',
      'Practice, practice, practice, you will notice things getting easier, trust.'
    ]" />
</template>
