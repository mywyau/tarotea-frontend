import { stopActiveJingles } from '@/utils/sounds'

const JINGLE_MUTE_KEY = 'quiz-jingles-muted'
const JINGLE_MUTE_EVENT = 'quiz-jingles-muted-change'

function readStoredMutePreference() {
  if (!process.client) return false
  return localStorage.getItem(JINGLE_MUTE_KEY) === 'true'
}

export const useJingleMute = () => {
  const muted = useState<boolean>('quiz-jingles-muted', readStoredMutePreference)

  const setMuted = (value: boolean) => {
    muted.value = value
  }

  const toggleMuted = () => {
    setMuted(!muted.value)
  }

  if (process.client) {
    watch(muted, (value) => {
      localStorage.setItem(JINGLE_MUTE_KEY, String(value))
      window.dispatchEvent(new CustomEvent(JINGLE_MUTE_EVENT, { detail: value }))

      if (value) {
        stopActiveJingles()
      }
    })

    const handleStorage = (event: StorageEvent) => {
      if (event.key === JINGLE_MUTE_KEY) {
        muted.value = event.newValue === 'true'
      }
    }

    onMounted(() => {
      muted.value = readStoredMutePreference()
      window.addEventListener('storage', handleStorage)
    })

    onBeforeUnmount(() => {
      window.removeEventListener('storage', handleStorage)
    })
  }

  return { muted, setMuted, toggleMuted }
}
