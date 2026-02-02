export const useGlobalAudio = () => {
  const current = useState<HTMLAudioElement | null>(
    'current-audio',
    () => null
  )

  const play = (audio: HTMLAudioElement) => {
    if (current.value && current.value !== audio) {
      current.value.pause()
      current.value.currentTime = 0
    }

    current.value = audio
    audio.play()
  }

  const stop = () => {
    if (current.value) {
      current.value.pause()
      current.value.currentTime = 0
      current.value = null
    }
  }

  return { current, play, stop }
}
