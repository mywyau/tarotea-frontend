<script setup lang="ts">
import { ChevronLeft, ChevronRight, Eye, EyeOff, ListVideo, Play, Repeat2, Square } from '@lucide/vue'
import { useStrokeWriter } from '~/composables/useStrokeWriter'

definePageMeta({ ssr: false, middleware: ['word-access'] })

type VocabWord = { id: string; word: string; jyutping?: string; meaning?: string }

const route = useRoute()
const wordId = computed(() => route.params.id as string)
const { data: word, pending, error } = await useFetch<VocabWord>(() => `/api/words/${wordId.value}`, {
  key: () => `word-${wordId.value}`,
  watch: [wordId],
})
const characters = computed(() => Array.from(word.value?.word ?? '').filter(char => /\p{Script=Han}/u.test(char)))
const index = ref(0)
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

const playback = ref<'idle' | 'character' | 'loop' | 'word'>('idle')
const fullCharacter = ref(false)
let run = 0

function showCharacter(full: boolean) {
  run++
  playback.value = 'idle'
  fullCharacter.value = full
  if (full) void writer.value?.showCharacter({ duration: 0 })
  else void writer.value?.hideCharacter({ duration: 0 })
}

function selectCharacter(position: number) {
  showCharacter(false)
  index.value = position
}

async function play(mode: 'character' | 'loop' | 'word') {
  if (playback.value === mode) {
    showCharacter(false)
    return
  }
  if (!writer.value) return

  showCharacter(false)
  const currentRun = run
  playback.value = mode
  if (mode === 'loop') {
    void writer.value.loopCharacterAnimation()
    return
  }

  const first = mode === 'word' ? 0 : index.value
  const last = mode === 'word' ? characters.value.length - 1 : index.value
  for (let position = first; position <= last; position++) {
    index.value = position
    await nextTick()
    await whenLoaded()
    if (currentRun !== run) return
    if (!writer.value) break
    await writer.value.animateCharacter()
    if (currentRun !== run) return
    if (position < last) {
      await new Promise(resolve => setTimeout(resolve, 350))
      if (currentRun !== run) return
    }
  }
  playback.value = 'idle'
  fullCharacter.value = !!writer.value
}

watch(wordId, () => selectCharacter(0))
onBeforeUnmount(() => { run++ })
</script>

<template>
  <div class="writing-page">
    <h1>Writing practice</h1>
    <p v-if="pending" role="status">Loading word…</p>
    <p v-else-if="error || !word" role="alert">Could not load this word.</p>

    <template v-else>
      <header class="word-summary">
        <strong lang="zh-HK">{{ word.word }}</strong>
        <span v-if="word.jyutping" class="word-reading">{{ word.jyutping }}</span>
        <span v-if="word.meaning">{{ word.meaning }}</span>
      </header>

      <section class="practice-sheet" aria-label="Stroke order practice">
        <div v-if="characters.length > 1" class="character-picker" role="group" aria-label="Select a character">
          <div class="character-choices">
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
            <template v-else-if="!character">No Chinese characters in this word.</template>
            <template v-else>Loading strokes…</template>
          </div>
        </div>

        <div class="controls" role="group" aria-label="Stroke controls">
          <button type="button" class="play-button" :disabled="!writer" @click="play('character')">
            <Square v-if="playback === 'character'" /><Play v-else />
            {{ playback === 'character' ? 'Stop' : 'Play strokes' }}
          </button>
          <button v-if="characters.length > 1" type="button" class="word-button" :disabled="!writer && playback !== 'word'"
            @click="play('word')">
            <Square v-if="playback === 'word'" /><ListVideo v-else />
            {{ playback === 'word' ? 'Stop word' : 'Play word' }}
          </button>
          <div class="display-controls">
            <button type="button" class="icon-button" aria-label="Loop strokes" title="Loop strokes"
              :aria-pressed="playback === 'loop'" :disabled="!writer" @click="play('loop')"><Repeat2 /></button>
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
.play-button, .word-button { padding-inline: 0.85rem; }
.play-button { color: white; background: rgb(var(--color-primary)); }
.play-button:hover:enabled { background: rgb(var(--color-primary-strong)); }
.word-button, .icon-button, .character-chip { color: rgb(var(--color-primary-strong)); background: rgb(var(--color-primary) / 0.07); }
.word-button:hover:enabled, .icon-button:hover:enabled, .character-chip:hover { background: rgb(var(--color-taro-lilac) / 0.34); }
button[aria-pressed='true'] { background: rgb(var(--color-taro-lilac) / 0.48); box-shadow: inset 0 0 0 1px rgb(var(--color-primary) / 0.48); }
.character-picker .character-chip { padding-inline: 0.5rem; font: 650 1.25rem var(--font-chinese); }
</style>
