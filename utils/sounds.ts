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

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

export function playCorrectJingle(volume = 0.8) {
  const ctx = getAudioContext();

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
  const ctx = getAudioContext();

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
  const ctx = getAudioContext();

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

export function playQuizCompleteOkaySong(volume = 0.12) {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.04);
  gain.gain.setValueAtTime(volume * 0.85, now + 0.9);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);

  gain.connect(ctx.destination);

  const notes = [
    // soft confirmation
    { t: 0.0, f: 660, d: 0.18 },
    { t: 0.25, f: 660, d: 0.18 },

    // slight lift to end
    { t: 0.6, f: 740, d: 0.25 },
  ];

  notes.forEach(({ t, f, d }) => {
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(f, now + t);

    osc.connect(gain);
    osc.start(now + t);
    osc.stop(now + t + d);
  });
}

export function playQuizCompleteFailSong(volume = 0.55) {
  const ctx = getAudioContext();

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


export function playWordUnlockFanfare(volume = 0.8) {
  const ctx = getAudioContext();

  if (ctx.state === "suspended") {
    void ctx.resume();
  }

  const now = ctx.currentTime;

  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(volume, now + 0.03);
  master.gain.exponentialRampToValueAtTime(0.0001, now + 0.95);
  master.connect(ctx.destination);

  const notes = [
    { t: 0.00, f: 783.99, d: 0.16 }, // G5
    { t: 0.10, f: 987.77, d: 0.18 }, // B5
    { t: 0.22, f: 1174.66, d: 0.22 }, // D6
    { t: 0.38, f: 1567.98, d: 0.42 }, // G6
  ];

  notes.forEach(({ t, f, d }) => {
    // Main tone
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(f, now + t);
    osc.frequency.exponentialRampToValueAtTime(f * 1.01, now + t + d);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now + t);
    gain.gain.exponentialRampToValueAtTime(0.55, now + t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + t + d);

    osc.connect(gain);
    gain.connect(master);

    osc.start(now + t);
    osc.stop(now + t + d);
  });

  // Small sparkle layer on the final note
  const sparkle = ctx.createOscillator();
  sparkle.type = "triangle";
  sparkle.frequency.setValueAtTime(3135.96, now + 0.40); // G7

  const sparkleGain = ctx.createGain();
  sparkleGain.gain.setValueAtTime(0.0001, now + 0.40);
  sparkleGain.gain.exponentialRampToValueAtTime(0.12, now + 0.43);
  sparkleGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.72);

  sparkle.connect(sparkleGain);
  sparkleGain.connect(master);

  sparkle.start(now + 0.40);
  sparkle.stop(now + 0.72);
}