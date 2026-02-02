export function playUISound(
  src: string,
  volume: number,
  playGlobal: (audio: HTMLAudioElement) => void,
) {
  const audio = new Audio(src);
  audio.volume = volume;
  audio.currentTime = 0;
  playGlobal(audio);
}

export function playCorrectJingle(volume = 0.8) {
  const ctx = new AudioContext();

  const now = ctx.currentTime;

  // Main oscillator (bell tone)
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(880, now); // A5
  osc.frequency.exponentialRampToValueAtTime(1320, now + 0.15); // E6

  // Gain (envelope)
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.4);
}

export function playIncorrectJingle(volume = 0.5) {
  const ctx = new AudioContext();
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  osc.type = "triangle"; // 🔑 much less sci-fi
  osc.frequency.setValueAtTime(520, now);
  osc.frequency.linearRampToValueAtTime(420, now + 0.18);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(volume, now + 0.015);
  gain.gain.linearRampToValueAtTime(0.0001, now + 0.22);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.25);
}

export function playQuizCompleteFanfareSong(volume = 0.9) {
  const ctx = new AudioContext();
  const now = ctx.currentTime;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.6);

  gain.connect(ctx.destination);

  // Simple major arpeggio (E major)
  const notes = [
    { t: 0.0, f: 660, d: 0.35 }, // E5
    { t: 0.4, f: 825, d: 0.35 }, // G#5
    { t: 0.8, f: 990, d: 0.4 }, // B5
    { t: 1.3, f: 1320, d: 0.5 }, // E6 (peak)
    { t: 1.9, f: 990, d: 0.6 }, // B5 (resolve)
  ];

  notes.forEach(({ t, f, d }) => {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(f, now + t);

    osc.connect(gain);
    osc.start(now + t);
    osc.stop(now + t + d);
  });
}

export function playQuizCompleteOkaySong(volume = 0.1) {
  const ctx = new AudioContext();
  const now = ctx.currentTime;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.05);
  gain.gain.setValueAtTime(volume * 0.9, now + 3.0);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.8);

  gain.connect(ctx.destination);

  // Repeated neutral confirmation pattern
  const notes = [
    // confirmation 1
    { t: 0.0, f: 660, d: 0.22 },
    { t: 0.35, f: 660, d: 0.22 },

    // confirmation 2
    { t: 1.2, f: 660, d: 0.22 },
    { t: 1.55, f: 660, d: 0.22 },

    // confirmation 3
    { t: 2.4, f: 660, d: 0.22 },
    { t: 2.75, f: 740, d: 0.3 }, // tiny lift to finish
  ];

  notes.forEach(({ t, f, d }) => {
    const osc = ctx.createOscillator();
    osc.type = "triangle"; // warm, non-alarming
    osc.frequency.setValueAtTime(f, now + t);

    osc.connect(gain);
    osc.start(now + t);
    osc.stop(now + t + d);
  });
}

export function playQuizCompleteFailSong(volume = 0.55) {
  const ctx = new AudioContext();
  const now = ctx.currentTime;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.06);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.8);
  gain.connect(ctx.destination);

  // Repeated descending motif (minor feel)
  const notes = [
    // motif 1
    { t: 0.0, f: 622, d: 0.35 }, // D#5
    { t: 0.35, f: 523, d: 0.35 }, // C5

    // motif 2 (lower)
    { t: 0.8, f: 523, d: 0.35 }, // C5
    { t: 1.15, f: 440, d: 0.35 }, // A4

    // motif 3 (lowest + final)
    { t: 1.7, f: 440, d: 0.4 }, // A4
    { t: 2.1, f: 370, d: 0.7 }, // F#4 (final stop)
  ];

  notes.forEach(({ t, f, d }) => {
    const osc = ctx.createOscillator();
    osc.type = "triangle"; // firmer, more serious than sine
    osc.frequency.setValueAtTime(f, now + t);

    osc.connect(gain);
    osc.start(now + t);
    osc.stop(now + t + d);
  });
}
