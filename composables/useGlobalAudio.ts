export const useGlobalAudio = () => {
  const current = useState<HTMLAudioElement | null>(
    'current-audio',
    () => null
  )

  const play = (audio: HTMLAudioElement) => {
    // Stop anything already playing
    if (current.value && current.value !== audio) {
      current.value.pause()
      current.value.currentTime = 0
    }

    current.value = audio
    audio.play()
  }

  return { current, play }
}
