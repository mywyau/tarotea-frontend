import { ref, shallowRef, watch, type Ref } from 'vue'
import type HanziWriter from 'hanzi-writer'
import type { CharacterJson } from 'hanzi-writer'
import { loadStrokeData, MissingStrokeData } from '../utils/writing/strokeData'

export function useStrokeWriter(host: Ref<HTMLDivElement | null>, character: Ref<string>, size: Ref<number>) {
  const writer = shallowRef<HanziWriter | null>(null)
  const loadError = ref<string | null>(null)
  const unsupportedCharacter = ref<string | null>(null)
  const retryCount = ref(0)
  let instance: HanziWriter | null = null
  let mountedHost: HTMLDivElement | null = null
  let glyph: CharacterJson
  let pending = Promise.resolve()

  watch([host, character, retryCount], ([element, char], _, onCleanup) => {
    writer.value = null
    loadError.value = null
    unsupportedCharacter.value = null
    if (!element || !char) return

    const controller = new AbortController()
    onCleanup(() => {
      controller.abort()
      if (writer.value) void writer.value.pauseAnimation()
    })

    async function render(element: HTMLDivElement, char: string) {
      try {
        const [{ default: Writer }, data] = await Promise.all([
          import('hanzi-writer'), loadStrokeData(char, controller.signal),
        ])
        if (controller.signal.aborted) return
        glyph = data
        if (!instance || mountedHost !== element) {
          instance = new Writer(element, {
            width: size.value, height: size.value, padding: size.value < 260 ? 12 : 20,
            charDataLoader: () => glyph,
            showOutline: true, showCharacter: false,
            outlineColor: 'rgba(17, 24, 39, 0.18)', strokeColor: '#111827', radicalColor: '#111827',
            strokeAnimationSpeed: 1, strokeHighlightSpeed: 2, delayBetweenStrokes: 250,
            delayBetweenLoops: 1200, drawingWidth: size.value < 260 ? 14 : 18,
          })
          mountedHost = element
        }
        await instance.setCharacter(char)
        if (!controller.signal.aborted) writer.value = instance
      } catch (error) {
        if (controller.signal.aborted) return
        if (error instanceof MissingStrokeData) unsupportedCharacter.value = char
        else loadError.value = 'Could not load the strokes. Please try again.'
      }
    }
    pending = render(element, char)
  }, { immediate: true, flush: 'post' })

  watch(size, width => instance?.updateDimensions({ width, height: width, padding: width < 260 ? 12 : 20 }))
  return { writer, loadError, unsupportedCharacter, retry: () => retryCount.value++, whenLoaded: () => pending }
}
