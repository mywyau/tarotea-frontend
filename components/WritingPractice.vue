<script setup lang="ts">
import { ChevronLeft, ChevronRight, Eye, EyeOff, ListVideo, Pause, Play, Repeat2, RotateCcw } from '@lucide/vue'
import { useStrokeWriter } from '~/composables/useStrokeWriter'

const props = defineProps<{
  kind: 'word' | 'sentence'
  text?: string
  jyutping?: string
  meaning?: string
  pending: boolean
  errorMessage?: string
}>()

const { showJyutping, showTranslation } = useReadingPreferences()
const characters = computed(() => Array.from(props.text ?? '').filter(char => /\p{Script=Han}/u.test(char)))
const index = ref(0)
const choices = ref<HTMLDivElement | null>(null)

// Follow sentence playback inside the character strip without scrolling the page.
watch(index, position => {
  if (props.kind !== 'sentence' || !choices.value) return
  const strip = choices.value
  const chip = strip.children.item(position) as HTMLElement | null
  if (!chip) return
  const left = chip.offsetLeft
  const right = left + chip.offsetWidth
  if (left < strip.scrollLeft) strip.scrollLeft = left
  else if (right > strip.scrollLeft + strip.clientWidth) strip.scrollLeft = right - strip.clientWidth
}, { flush: 'post' })

const character = computed(() => characters.value[index.value] ?? '')
const writerHost = ref<HTMLDivElement | null>(null)
const writerSize = ref(320)
const { writer, loadError, unsupportedCharacter, retry, whenLoaded } = useStrokeWriter(writerHost, character, writerSize)

watch(writerHost, (host, _, onCleanup) => {
  if (!host) return
  const observer = new ResizeObserver(([entry]) => {
    if (entry && entry.contentRect.width > 0) writerSize.value = Math.round(entry.contentRect.width)
  })
  observer.observe(host)
  onCleanup(() => observer.disconnect())
}, { flush: 'post' })

const playback = ref<'idle' | 'playing' | 'paused' | 'finished'>('idle')
const autoAdvance = ref(true)
const looping = ref(false)
const fullCharacter = ref(false)
let run = 0
let releasePause: (() => void) | undefined

function stopPlayback() {
  run++
  releasePause?.()
  releasePause = undefined
  playback.value = 'idle'
  looping.value = false
}

function showCharacter(full: boolean) {
  stopPlayback()
  fullCharacter.value = full
  if (full) void writer.value?.showCharacter({ duration: 0 })
  else void writer.value?.hideCharacter({ duration: 0 })
}

// Pause can also land during a data request or in the gap between characters.
async function waitForPlayback(currentRun: number) {
  while (currentRun === run && playback.value === 'paused') {
    await new Promise<void>(resolve => { releasePause = resolve })
  }
  return currentRun === run
}

async function playFrom(position: number, repeat = false) {
  showCharacter(false)
  const currentRun = run
  playback.value = 'playing'
  looping.value = repeat

  for (; position < characters.value.length; position++) {
    index.value = position
    await nextTick()
    await whenLoaded()
    if (!(await waitForPlayback(currentRun))) return

    if (writer.value) {
      if (repeat) await writer.value.loopCharacterAnimation()
      else await writer.value.animateCharacter()
      if (currentRun !== run) return
      fullCharacter.value = true
    } else if (!unsupportedCharacter.value) {
      stopPlayback()
      return
    }

    if (!autoAdvance.value || position === characters.value.length - 1) break
    await new Promise(resolve => setTimeout(resolve, 350))
    if (!(await waitForPlayback(currentRun))) return
    if (!autoAdvance.value) break
    fullCharacter.value = false
  }
  playback.value = 'finished'
}

function togglePlayback() {
  if (playback.value === 'playing') {
    playback.value = 'paused'
    void writer.value?.pauseAnimation()
  } else if (playback.value === 'paused') {
    playback.value = 'playing'
    void writer.value?.resumeAnimation()
    releasePause?.()
    releasePause = undefined
  } else {
    const replayAll = autoAdvance.value && playback.value === 'finished' && index.value === characters.value.length - 1
    void playFrom(replayAll ? 0 : index.value)
  }
}

function startOver() {
  const position = looping.value || !autoAdvance.value ? index.value : 0
  void playFrom(position, looping.value)
}

function selectCharacter(position: number) {
  if (playback.value === 'playing') void playFrom(position, looping.value)
  else {
    showCharacter(false)
    index.value = position
  }
}

watch([writerHost, characters], ([host, glyphs]) => {
  if (host && glyphs.length > 0 && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    void playFrom(0)
  }
}, { flush: 'post' })

onBeforeUnmount(() => showCharacter(false))
</script>

<template>
  <div class="writing-page" :class="{ 'sentence-practice': kind === 'sentence' }">
    <h1>{{ kind === 'sentence' ? 'Sentence writing practice' : 'Writing practice' }}</h1>
    <p v-if="pending" role="status">Loading {{ kind }}…</p>
    <p v-else-if="errorMessage" role="alert">{{ errorMessage }}</p>

    <template v-else>
      <header class="word-summary">
        <strong lang="zh-HK">{{ text }}</strong>
        <span v-if="jyutping && showJyutping" class="word-reading">{{ jyutping }}</span>
        <span v-if="meaning && showTranslation">{{ meaning }}</span>
        <div v-if="jyutping || meaning" class="flex flex-wrap items-center gap-x-4">
          <ReadingDisplayToggle v-if="jyutping" v-model="showJyutping">Show Jyutping</ReadingDisplayToggle>
          <ReadingDisplayToggle v-if="meaning" v-model="showTranslation">Show translation</ReadingDisplayToggle>
        </div>
      </header>

      <section class="practice-sheet" aria-label="Stroke order practice">
        <div v-if="characters.length > 1" class="character-picker" role="group" aria-label="Select a character">
          <div ref="choices" class="character-choices">
            <button v-for="(glyph, position) in characters" :key="position" type="button" class="character-chip"
              :aria-label="`Character ${position + 1}: ${glyph}`" :aria-pressed="position === index"
              @click="selectCharacter(position)"><span lang="zh-HK">{{ glyph }}</span></button>
          </div>
          <div class="character-nav">
            <button type="button" class="icon-button" aria-label="Previous character" title="Previous character"
              :disabled="index === 0" @click="selectCharacter(index - 1)"><ChevronLeft /></button>
            <span class="position" aria-live="polite">{{ index + 1 }} / {{ characters.length }}</span>
            <button type="button" class="icon-button" aria-label="Next character" title="Next character"
              :disabled="index === characters.length - 1" @click="selectCharacter(index + 1)"><ChevronRight /></button>
          </div>
        </div>

        <div class="writer-shell" :aria-label="`Stroke order for ${character}`" role="group">
          <div ref="writerHost" class="writer-glyph" aria-hidden="true" :style="{ visibility: writer ? 'visible' : 'hidden' }" />
          <div v-if="!writer" class="board-status" role="status">
            <template v-if="loadError">{{ loadError }} <button type="button" @click="retry">Retry</button></template>
            <template v-else-if="unsupportedCharacter">Stroke order is unavailable for “{{ unsupportedCharacter }}”.</template>
            <template v-else-if="!character">No Chinese characters in this {{ kind }}.</template>
            <template v-else>Loading strokes…</template>
          </div>
        </div>

        <div class="controls" role="group" aria-label="Stroke controls">
          <button type="button" class="play-button" :disabled="!characters.length || !!loadError" @click="togglePlayback">
            <Pause v-if="playback === 'playing'" /><Play v-else />
            {{ playback === 'playing' ? 'Pause' : playback === 'paused' ? 'Resume' : 'Play' }}
          </button>
          <button type="button" class="sequence-button" :disabled="!characters.length" @click="startOver">
            <RotateCcw /> Start over
          </button>
          <div class="display-controls">
            <button v-if="characters.length > 1" type="button" class="icon-button" aria-label="Auto-advance"
              title="Auto-advance to the next character" :aria-pressed="autoAdvance" @click="autoAdvance = !autoAdvance"><ListVideo /></button>
            <button type="button" class="icon-button" aria-label="Loop strokes" title="Loop strokes"
              :aria-pressed="looping" :disabled="!writer" @click="looping ? showCharacter(false) : playFrom(index, true)"><Repeat2 /></button>
            <button type="button" class="icon-button" aria-label="Show full character"
              :title="fullCharacter ? 'Show outline only' : 'Show full character'" :aria-pressed="fullCharacter"
              :disabled="!writer" @click="showCharacter(!fullCharacter)"><Eye v-if="!fullCharacter" /><EyeOff v-else /></button>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.writing-page {
  width: min(100%, 48rem);
  margin: 0 auto;
  padding: clamp(1rem, 4vw, 2.75rem) var(--page-gutter);
  color: rgb(var(--color-ink));
}
.writing-page h1 {
  font-size: clamp(1.55rem, 3.5vw, 2.35rem);
  font-weight: 750;
  letter-spacing: -0.04em;
}
.word-summary { display: flex; flex-wrap: wrap; align-items: baseline; gap: 0.25rem 0.85rem; margin: 0.6rem 0 1.15rem; overflow-wrap: anywhere; }
.word-summary strong { font: 700 1.65rem/1.2 var(--font-chinese); }
.word-reading { color: rgb(var(--color-primary-strong)); font-weight: 650; }
.practice-sheet { overflow: hidden; border: 1px solid rgb(var(--color-ink) / 0.15); border-radius: var(--radius-panel); background: rgb(var(--color-surface)); box-shadow: var(--shadow-soft); }
.writer-shell {
  display: grid;
  place-items: center;
  position: relative;
  padding: clamp(0.5rem, 2vw, 1rem);
  background-color: #fffdf8;
  background-image: linear-gradient(#94b5cf38 1px, transparent 1px), linear-gradient(90deg, #94b5cf38 1px, transparent 1px);
  background-size: 32px 32px;
  background-position: center;
}
.writer-shell::before, .writer-shell::after { content: ''; position: absolute; pointer-events: none; background: #ab69734d; }
.writer-shell::before { width: 1px; height: 100%; }
.writer-shell::after { width: 100%; height: 1px; }
.writer-glyph { z-index: 1; width: min(100%, 25rem); aspect-ratio: 1; }
.board-status { position: absolute; z-index: 2; max-width: 90%; padding: 0.7rem 1rem; background: #fffdf8; text-align: center; }
.board-status button { color: rgb(var(--color-primary-strong)); text-decoration: underline; }
.controls, .character-picker { display: flex; align-items: center; flex-wrap: wrap; gap: 0.5rem; padding: 0.7rem clamp(0.5rem, 2vw, 1rem); }
.controls { border-top: 1px solid rgb(var(--color-ink) / 0.13); }
.character-picker { justify-content: space-between; border-bottom: 1px solid rgb(var(--color-ink) / 0.13); }
.character-choices, .character-nav, .display-controls { display: flex; align-items: center; gap: 0.25rem; }
.character-choices { flex-wrap: wrap; }
.display-controls { margin-left: auto; }
.position { min-width: 3rem; text-align: center; color: rgb(var(--color-muted)); font-size: 0.875rem; font-variant-numeric: tabular-nums; }
.controls button, .character-picker button {
  display: inline-flex;
  min-width: 2.75rem;
  min-height: 2.75rem;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  border-radius: var(--radius-control);
  font-size: 0.9rem;
  font-weight: 650;
}
.writing-page button:focus-visible { outline: 2px solid rgb(var(--color-primary-strong)); outline-offset: -2px; }
.controls .play-button:focus-visible { outline-color: white; }
.controls button:disabled, .character-picker button:disabled { opacity: 0.4; cursor: not-allowed; }
.controls svg, .character-picker svg { width: 1.15rem; height: 1.15rem; pointer-events: none; }
.play-button, .sequence-button { padding-inline: 0.85rem; }
.play-button { color: white; background: rgb(var(--color-primary)); }
.play-button:hover:enabled { background: rgb(var(--color-primary-strong)); }
.sequence-button, .icon-button, .character-chip { color: rgb(var(--color-primary-strong)); background: rgb(var(--color-primary) / 0.07); }
.sequence-button:hover:enabled, .icon-button:hover:enabled, .character-chip:hover { background: rgb(var(--color-taro-lilac) / 0.34); }
button[aria-pressed='true'] { background: rgb(var(--color-taro-lilac) / 0.48); box-shadow: inset 0 0 0 1px rgb(var(--color-primary) / 0.48); }
.character-picker .character-chip { padding-inline: 0.5rem; font: 650 1.25rem var(--font-chinese); }
.sentence-practice .word-summary { display: grid; gap: 0.3rem; }
.sentence-practice .word-summary strong { line-height: 1.45; }
.sentence-practice .character-picker { flex-wrap: nowrap; }
.sentence-practice .character-choices {
  position: relative;
  min-width: 0;
  flex-wrap: nowrap;
  overflow-x: auto;
  overscroll-behavior-x: contain;
}
.sentence-practice .character-chip, .sentence-practice .character-nav { flex-shrink: 0; }

</style>
