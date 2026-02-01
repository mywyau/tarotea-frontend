export function playUISound(
  src: string,
  volume: number,
  playGlobal: (audio: HTMLAudioElement) => void
) {
  const audio = new Audio(src)
  audio.volume = volume
  audio.currentTime = 0
  playGlobal(audio)
}


export function playCorrectJingle(volume = 0.8) {
  const ctx = new AudioContext()

  const now = ctx.currentTime

  // Main oscillator (bell tone)
  const osc = ctx.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(880, now) // A5
  osc.frequency.exponentialRampToValueAtTime(1320, now + 0.15) // E6

  // Gain (envelope)
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.05)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35)

  osc.connect(gain)
  gain.connect(ctx.destination)

  osc.start(now)
  osc.stop(now + 0.4)
}


export function playIncorrectJingle(volume = 0.2) {
  const ctx = new AudioContext()
  const now = ctx.currentTime

  const osc = ctx.createOscillator()
  osc.type = 'triangle' // 🔑 much less sci-fi
  osc.frequency.setValueAtTime(520, now)
  osc.frequency.linearRampToValueAtTime(420, now + 0.18)

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.linearRampToValueAtTime(volume, now + 0.015)
  gain.gain.linearRampToValueAtTime(0.0001, now + 0.22)

  osc.connect(gain)
  gain.connect(ctx.destination)

  osc.start(now)
  osc.stop(now + 0.25)
}
