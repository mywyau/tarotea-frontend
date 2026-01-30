export const useAudioVolume = () => {
  const volume = useState<number>('audio-volume', () => {
    if (process.client) {
      return Number(localStorage.getItem('audio-volume') ?? 1)
    }
    return 1
  })

  watch(volume, v => {
    if (process.client) {
      localStorage.setItem('audio-volume', String(v))
    }
  })

  return { volume }
}
