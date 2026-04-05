<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue"

definePageMeta({
  ssr: false,
  middleware: ["writing-access"]
})

type VocabWord = {
  id: string
  word: string
  jyutping?: string
  meaning?: string
}

type WriterLike = {
  animateCharacter: (options?: Record<string, unknown>) => Promise<void> | void
  loopCharacterAnimation: () => void
  showCharacter: (options?: Record<string, unknown>) => void
  hideCharacter: (options?: Record<string, unknown>) => void
  showOutline: (options?: Record<string, unknown>) => void
  hideOutline: (options?: Record<string, unknown>) => void
}

const route = useRoute()
const wordId = computed(() => route.params.id as string)

const {
  data: word,
  pending,
  error,
} = await useFetch<VocabWord>(() => `/api/words/${wordId.value}`, {
  key: () => `word-${wordId.value}`,
  watch: [wordId],
})

const writerHost = ref<HTMLDivElement | null>(null)
const writer = ref<WriterLike | null>(null)

const currentCharIndex = ref(0)
const isLoading = ref(false)
const isReady = ref(false)
const loadError = ref<string | null>(null)

const unsupportedCharacter = ref<string | null>(null)

async function animateCurrentCharacter() {
  if (!writer.value) return

  writer.value.hideCharacter({ duration: 0 })
  writer.value.showOutline({ duration: 0 })
  await writer.value.animateCharacter()
}

function loopAnimation() {
  if (!writer.value) return

  writer.value.hideCharacter({ duration: 0 })
  writer.value.showOutline({ duration: 0 })
  writer.value.loopCharacterAnimation()
}

async function animateWholeWord() {
  if (!selectedCharacters.value.length) return

  for (let i = 0; i < selectedCharacters.value.length; i += 1) {
    currentCharIndex.value = i
    await nextTick()
    await new Promise((resolve) => setTimeout(resolve, 150))
    await animateCurrentCharacter()
    await new Promise((resolve) => setTimeout(resolve, 350))
  }
}

function showOnlyOutline() {
  if (!writer.value) return
  writer.value.hideCharacter({ duration: 0 })
  writer.value.showOutline({ duration: 0 })
}

function showCharacterAndOutline() {
  if (!writer.value) return
  writer.value.showCharacter({ duration: 0 })
  writer.value.showOutline({ duration: 0 })
}

function isHanCharacter(char: string): boolean {
  return /\p{Script=Han}/u.test(char)
}

const selectedCharacters = computed(() => {
  return Array.from(word.value?.word ?? "").filter(isHanCharacter)
})

const currentCharacter = computed(() => {
  return selectedCharacters.value[currentCharIndex.value] ?? ""
})

const progressLabel = computed(() => {
  const total = selectedCharacters.value.length
  if (total === 0) return "0 / 0"
  return `${currentCharIndex.value + 1} / ${total}`
})

function previousCharacter() {
  if (currentCharIndex.value > 0) currentCharIndex.value -= 1
}

function nextCharacter() {
  if (currentCharIndex.value < selectedCharacters.value.length - 1) {
    currentCharIndex.value += 1
  }
}

async function loadWriter(char: string) {
  if (!process.client || !char || !writerHost.value) return

  isLoading.value = true
  isReady.value = false
  loadError.value = null
  unsupportedCharacter.value = null

  try {
    writerHost.value.innerHTML = ""

    const mod = await import("hanzi-writer")
    const HanziWriter = (mod as { default?: any }).default ?? mod

    writer.value = HanziWriter.create(writerHost.value, char, {
      width: writerSize.value,
      height: writerSize.value,
      padding: writerSize.value < 260 ? 12 : 20,
      showOutline: true,
      showCharacter: false,
      outlineColor: "#d1d5db",
      strokeColor: "#111827",
      strokeAnimationSpeed: 1,
      strokeHighlightSpeed: 2,
      delayBetweenStrokes: 250,
      delayBetweenLoops: 1200,
      drawingWidth: writerSize.value < 260 ? 14 : 18,
      onLoadCharDataSuccess: () => {
        isReady.value = true
        isLoading.value = false
        unsupportedCharacter.value = null
        writer.value?.hideCharacter({ duration: 0 })
        writer.value?.showOutline({ duration: 0 })
      },
      onLoadCharDataError: () => {
        unsupportedCharacter.value = char
        isReady.value = false
        isLoading.value = false
        loadError.value = null

        if (writerHost.value) {
          writerHost.value.innerHTML = ""
        }
      },
    })
  } catch (err) {
    console.error(err)
    unsupportedCharacter.value = null
    loadError.value = "Failed to initialise Hanzi Writer."
    isLoading.value = false
  }
}

const writerSize = ref(320)

function updateWriterSize() {
  if (!process.client) return

  const width = window.innerWidth
  if (width < 400) writerSize.value = 220
  else if (width < 640) writerSize.value = 260
  else writerSize.value = 320
}

onMounted(() => {
  updateWriterSize()
  window.addEventListener("resize", updateWriterSize)
})

onBeforeUnmount(() => {
  window.removeEventListener("resize", updateWriterSize)
})

watch(
  () => word.value?.id,
  () => {
    currentCharIndex.value = 0
  },
)

watch(
  [() => currentCharacter.value, writerHost, () => writerSize.value],
  async ([char, host]) => {
    if (!char || !host) return
    await nextTick()
    await loadWriter(char)
  },
  { immediate: true, flush: "post" },
)

</script>

<template>

  <div class="mx-auto max-w-4xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">

    <div class="mb-6">
      <BackLink />
    </div>

    <div class="mb-6">

      <p class="text-sm font-medium uppercase tracking-wide text-gray-500">
        Writing Practice
      </p>
      <h1 class="mt-2 text-2xl font-bold text-gray-900 sm:text-3xl">
        Follow the brush strokes
      </h1>
      <p class="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
        Watch the stroke order for this word and move through each character one by one.
      </p>
    </div>

    <div class="grid gap-6">
      <section class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div v-if="pending" class="text-sm text-gray-500">
          Loading word...
        </div>

        <div v-else-if="error || !word" class="text-sm text-red-600">
          Could not load this word.
        </div>

        <template v-else>
          <div class="mt-5 grid gap-6 md:grid-cols-[minmax(0,1fr)_280px]">
            <!-- Left side -->
            <div class="space-y-5">
              <div class="rounded-xl bg-gray-50 px-4 py-3">
                <p class="text-sm text-gray-500">Word</p>
                <p class="mt-1 text-2xl font-bold text-gray-900">{{ word.word }}</p>
                <p class="mt-1 text-sm text-gray-600">{{ word.jyutping || "" }}</p>
                <p class="mt-1 text-sm text-gray-600">{{ word.meaning || "" }}</p>
              </div>

              <div class="rounded-xl border border-gray-200 bg-white p-4 md:hidden">
                <div class="mb-4">
                  <p class="text-sm font-medium text-gray-500">Current character</p>
                  <p class="mt-1 text-3xl font-bold text-gray-900">
                    {{ currentCharacter || "—" }}
                  </p>
                  <p class="mt-2 text-sm text-gray-600">
                    Progress: {{ progressLabel }}
                  </p>
                </div>

                <div class="space-y-3">
                  <button type="button"
                    class="w-full rounded-xl border border-gray-900 bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
                    :disabled="!isReady" @click="animateCurrentCharacter">
                    Play strokes
                  </button>

                  <button type="button"
                    class="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-800 transition hover:border-gray-900 disabled:opacity-50"
                    :disabled="!isReady || !selectedCharacters.length" @click="animateWholeWord">
                    Play whole word
                  </button>
                </div>

                <div class="my-5 border-t border-gray-200"></div>

                <div class="grid grid-cols-2 gap-3">
                  <button type="button"
                    class="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-800 transition hover:border-gray-900 disabled:opacity-50"
                    :disabled="currentCharIndex === 0" @click="previousCharacter">
                    Previous
                  </button>

                  <button type="button"
                    class="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-800 transition hover:border-gray-900 disabled:opacity-50"
                    :disabled="currentCharIndex >= selectedCharacters.length - 1" @click="nextCharacter">
                    Next
                  </button>
                </div>
              </div>

              <div
                class="flex min-h-[260px] sm:min-h-[320px] lg:min-h-[380px] items-center justify-center rounded-2xl border border-gray-200 bg-white p-4 sm:p-6">

                <div v-if="loadError" class="max-w-sm text-center text-sm text-red-600">
                  {{ loadError }}
                </div>

                <div v-else-if="unsupportedCharacter" class="max-w-sm text-center text-sm text-amber-700">
                  This tool is not supported for “{{ unsupportedCharacter }}” due to missing stroke data.
                </div>

                <div v-else-if="!currentCharacter" class="max-w-sm text-center text-sm text-gray-500">
                  No Chinese character available for this word.
                </div>

                <div ref="writerHost" :style="{ width: `${writerSize}px`, height: `${writerSize}px` }" />
              </div>
            </div>

            <!-- Right side panel -->
            <aside class="hidden md:sticky md:top-6 md:block h-fit rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              

              <div class="mb-4">
                <p class="text-sm font-medium text-gray-500">Current character</p>
                <p class="mt-1 text-3xl font-bold text-gray-900">
                  {{ currentCharacter || "—" }}
                </p>
                <p class="mt-2 text-sm text-gray-600">
                  Progress: {{ progressLabel }}
                </p>
              </div>

              <div v-if="selectedCharacters.length > 1" class="mb-5 flex flex-wrap gap-2">
                <button v-for="(char, index) in selectedCharacters" :key="`${char}-${index}`" type="button"
                  class="rounded-lg border px-3 py-1.5 text-base font-semibold transition" :class="index === currentCharIndex
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-300 bg-white text-gray-900'
                    " @click="currentCharIndex = index">
                  {{ char }}
                </button>
              </div>

              <div class="space-y-3">
                <button type="button"
                  class="w-full rounded-xl border border-gray-900 bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
                  :disabled="!isReady" @click="animateCurrentCharacter">
                  Play strokes
                </button>

                <button type="button"
                  class="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-800 transition hover:border-gray-900 disabled:opacity-50"
                  :disabled="!isReady" @click="loopAnimation">
                  Loop animation
                </button>

                <button type="button"
                  class="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-800 transition hover:border-gray-900 disabled:opacity-50"
                  :disabled="!isReady || !selectedCharacters.length" @click="animateWholeWord">
                  Play whole word
                </button>
              </div>

              <div class="my-5 border-t border-gray-200"></div>

              <div class="space-y-3">
                <button type="button"
                  class="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-800 transition hover:border-gray-900 disabled:opacity-50"
                  :disabled="currentCharIndex === 0" @click="previousCharacter">
                  Previous character
                </button>

                <button type="button"
                  class="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-800 transition hover:border-gray-900 disabled:opacity-50"
                  :disabled="currentCharIndex >= selectedCharacters.length - 1" @click="nextCharacter">
                  Next character
                </button>
              </div>

              <div class="my-5 border-t border-gray-200"></div>

              <div class="space-y-3">
                <button type="button"
                  class="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-800 transition hover:border-gray-900 disabled:opacity-50"
                  :disabled="!isReady" @click="showOnlyOutline">
                  Outline only
                </button>

                <button type="button"
                  class="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-800 transition hover:border-gray-900 disabled:opacity-50"
                  :disabled="!isReady" @click="showCharacterAndOutline">
                  Show full character
                </button>
              </div>
            </aside>
          </div>
        </template>

      </section>
    </div>
  </div>
</template>