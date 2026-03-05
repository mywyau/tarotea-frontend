<script setup lang="ts">

definePageMeta({
  ssr: false,
  middleware: 'coming-soon'
})

type ToneItem = {
  id: string
  syllable: string
  tone: number
  audioUrl: string
}

const tones: ToneItem[] = [
  { id: "si1", syllable: "si", tone: 1, audioUrl: "/tones/si1.mp3" },
  { id: "si2", syllable: "si", tone: 2, audioUrl: "/tones/si2.mp3" },
  { id: "si3", syllable: "si", tone: 3, audioUrl: "/tones/si3.mp3" },
  { id: "si4", syllable: "si", tone: 4, audioUrl: "/tones/si4.mp3" },
  { id: "si5", syllable: "si", tone: 5, audioUrl: "/tones/si5.mp3" },
  { id: "si6", syllable: "si", tone: 6, audioUrl: "/tones/si6.mp3" }
]

function randomTone(): ToneItem {
  return tones[Math.floor(Math.random() * tones.length)]
}

const ladder = ref<ToneItem[]>([])
const ladderLength = ref(10)
const currentIndex = ref(0)

const score = ref(0)
const streak = ref(0)

const feedback = ref<string | null>(null)
const selectedTone = ref<number | null>(null)

const audio = ref<HTMLAudioElement | null>(null)

function startRound() {
  ladder.value = Array.from({ length: ladderLength.value }, () => randomTone())
  currentIndex.value = 0
  score.value = 0
  streak.value = 0
  selectedTone.value = null
  feedback.value = null
}

const current = computed(() => ladder.value[currentIndex.value])

function playAudio() {
  if (!current.value) return
  audio.value = new Audio(current.value.audioUrl)
  audio.value.play()
}

function chooseTone(tone: number) {

  if (!current.value || selectedTone.value !== null) return

  selectedTone.value = tone

  if (tone === current.value.tone) {

    streak.value++
    score.value += 10 + streak.value

    feedback.value = "Correct!"

  } else {

    feedback.value = `Wrong — tone ${current.value.tone}`
    streak.value = 0
  }

  setTimeout(nextStep, 800)
}

function nextStep() {

  selectedTone.value = null
  feedback.value = null

  currentIndex.value++

  if (currentIndex.value >= ladder.value.length) {
    finished.value = true
  }
}

const finished = ref(false)

onMounted(() => {
  startRound()
})

</script>

<template>

<main class="mx-auto max-w-xl px-6 py-12">

<header class="space-y-2 mb-6">

<h1 class="text-2xl font-semibold text-gray-900">
Tone Ladder Trainer
</h1>

<p class="text-sm text-gray-600">
Climb the ladder by identifying tones correctly.
</p>

</header>

<section class="rounded-2xl border border-gray-200 bg-white p-6 space-y-5">

<div class="flex justify-between text-sm text-gray-700">

<div>
Step {{ currentIndex + 1 }} / {{ ladderLength }}
</div>

<div>
Score {{ score }}
</div>

<div>
Streak {{ streak }}
</div>

</div>

<div v-if="!finished">

<div class="text-center">

<button
class="px-4 py-2 border rounded-lg text-sm"
@click="playAudio"
>
▶ Play Tone
</button>

</div>

<div class="grid grid-cols-3 gap-3 mt-6">

<button
v-for="tone in [1,2,3,4,5,6]"
:key="tone"
@click="chooseTone(tone)"
class="rounded-xl border px-4 py-3 text-sm hover:bg-gray-50"
:class="{
'bg-green-100 border-green-400': selectedTone === tone && tone === current?.tone,
'bg-red-100 border-red-400': selectedTone === tone && tone !== current?.tone
}"
>

Tone {{ tone }}

</button>

</div>

<div v-if="feedback" class="text-center text-sm font-medium mt-4">

{{ feedback }}

</div>

</div>

<div v-else class="text-center space-y-4">

<div class="text-lg font-semibold">
Training Complete
</div>

<div class="text-sm">
Final Score: {{ score }}
</div>

<button
class="px-4 py-2 rounded-lg bg-black text-white"
@click="finished = false; startRound()"
>
Train Again
</button>

</div>

</section>

</main>

</template>