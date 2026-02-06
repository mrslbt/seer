/**
 * Ethereal Sound Effects Module
 *
 * Generates mysterious, atmospheric sounds using the Web Audio API.
 * Modern, ambient sounds with reverb and subtle harmonics.
 */

type AudioContextType = typeof AudioContext;

let audioContext: AudioContext | null = null;
let convolver: ConvolverNode | null = null;
let isMuted = false;

/**
 * Initialize or get the audio context
 */
function getAudioContext(): AudioContext | null {
  if (isMuted) return null;

  if (!audioContext) {
    try {
      const AudioContextClass = window.AudioContext ||
        (window as unknown as { webkitAudioContext: AudioContextType }).webkitAudioContext;
      audioContext = new AudioContextClass();
    } catch {
      console.warn('Web Audio API not supported');
      return null;
    }
  }

  // Resume if suspended (required for some browsers)
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }

  return audioContext;
}

/**
 * Create a simple reverb impulse response
 */
function createReverbImpulse(ctx: AudioContext, duration: number = 2, decay: number = 2): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = sampleRate * duration;
  const impulse = ctx.createBuffer(2, length, sampleRate);

  for (let channel = 0; channel < 2; channel++) {
    const channelData = impulse.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }

  return impulse;
}

/**
 * Get or create reverb convolver
 */
function getReverb(): ConvolverNode | null {
  const ctx = getAudioContext();
  if (!ctx) return null;

  if (!convolver) {
    convolver = ctx.createConvolver();
    convolver.buffer = createReverbImpulse(ctx, 1.5, 2.5);
  }

  return convolver;
}

/**
 * Set mute state
 */
export function setMuted(muted: boolean): void {
  isMuted = muted;
}

/**
 * Check if audio is muted
 */
export function getMuted(): boolean {
  return isMuted;
}

/**
 * Play an ethereal tone with harmonics
 */
function playEtherealTone(
  frequency: number,
  duration: number = 0.5,
  volume: number = 0.15,
  attack: number = 0.1,
  release: number = 0.3
): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Main oscillator (sine for smooth sound)
  const osc1 = ctx.createOscillator();
  osc1.type = 'sine';
  osc1.frequency.value = frequency;

  // Harmonic overtone (octave up, quieter)
  const osc2 = ctx.createOscillator();
  osc2.type = 'sine';
  osc2.frequency.value = frequency * 2;

  // Sub harmonic (octave down, subtle)
  const osc3 = ctx.createOscillator();
  osc3.type = 'sine';
  osc3.frequency.value = frequency / 2;

  // Gain nodes for each oscillator
  const gain1 = ctx.createGain();
  const gain2 = ctx.createGain();
  const gain3 = ctx.createGain();

  // Master gain with envelope
  const masterGain = ctx.createGain();

  // Low-pass filter for warmth
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 2000;
  filter.Q.value = 0.5;

  // Connect oscillators to their gains
  osc1.connect(gain1);
  osc2.connect(gain2);
  osc3.connect(gain3);

  gain1.gain.value = volume;
  gain2.gain.value = volume * 0.3;
  gain3.gain.value = volume * 0.2;

  // Mix to filter
  gain1.connect(filter);
  gain2.connect(filter);
  gain3.connect(filter);

  // Filter to master
  filter.connect(masterGain);

  // Envelope
  masterGain.gain.setValueAtTime(0, now);
  masterGain.gain.linearRampToValueAtTime(1, now + attack);
  masterGain.gain.setValueAtTime(1, now + duration - release);
  masterGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  // Connect to destination (with optional reverb)
  const reverb = getReverb();
  if (reverb) {
    const dryGain = ctx.createGain();
    const wetGain = ctx.createGain();
    dryGain.gain.value = 0.7;
    wetGain.gain.value = 0.3;

    masterGain.connect(dryGain);
    masterGain.connect(reverb);
    reverb.connect(wetGain);

    dryGain.connect(ctx.destination);
    wetGain.connect(ctx.destination);
  } else {
    masterGain.connect(ctx.destination);
  }

  // Start and stop
  osc1.start(now);
  osc2.start(now);
  osc3.start(now);
  osc1.stop(now + duration + 0.1);
  osc2.stop(now + duration + 0.1);
  osc3.stop(now + duration + 0.1);
}

/**
 * Play a soft shimmer (high frequency sparkle)
 */
function playShimmer(baseFreq: number = 2000, duration: number = 0.3): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Multiple detuned oscillators for shimmer effect
  const frequencies = [baseFreq, baseFreq * 1.01, baseFreq * 0.99, baseFreq * 1.5];

  frequencies.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = freq;

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.03, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + i * 0.02);
    osc.stop(now + duration);
  });
}

/**
 * Play UI click sound - soft, subtle
 */
export function playClick(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(800, now);
  osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);

  filter.type = 'lowpass';
  filter.frequency.value = 1500;

  gain.gain.setValueAtTime(0.1, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.1);
}

/**
 * Play success sound - ascending ethereal chord
 */
export function playSuccess(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  // Ethereal major chord with shimmer
  const notes = [523, 659, 784]; // C5, E5, G5

  notes.forEach((freq, i) => {
    setTimeout(() => {
      playEtherealTone(freq, 0.6, 0.12, 0.05, 0.4);
    }, i * 100);
  });

  // Add sparkle
  setTimeout(() => playShimmer(3000, 0.4), 250);
}

/**
 * Play error/warning sound - gentle warning
 */
export function playError(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  // Soft descending minor second
  playEtherealTone(440, 0.3, 0.1, 0.02, 0.2);
  setTimeout(() => playEtherealTone(415, 0.4, 0.08, 0.02, 0.3), 150);
}

/**
 * Play shake sound - mysterious whoosh
 */
export function playShake(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const duration = 0.15;

  // Filtered noise burst
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.5;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  // Band-pass filter for whooshy sound
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(800, now);
  filter.frequency.exponentialRampToValueAtTime(200, now + duration);
  filter.Q.value = 2;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  source.start(now);
}

/**
 * Play reveal sound - mystical unveiling
 */
export function playReveal(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  // Rising ethereal arpeggio
  const notes = [262, 330, 392, 523]; // C4 to C5
  notes.forEach((freq, i) => {
    setTimeout(() => {
      playEtherealTone(freq, 0.4, 0.1, 0.03, 0.3);
    }, i * 120);
  });

  // Final shimmer
  setTimeout(() => {
    playShimmer(2500, 0.5);
    playEtherealTone(523, 0.8, 0.15, 0.1, 0.5); // Hold the top note
  }, 500);
}

/**
 * Play typing sound - soft subtle tick
 */
export function playType(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.value = 1200 + Math.random() * 400;

  gain.gain.setValueAtTime(0.03, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.04);
}

/**
 * Play mystical ambient pad
 */
export function playMysticPad(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Soft ambient drone with shimmer
  const baseFreqs = [131, 196, 262]; // C3, G3, C4 (open fifth + octave)

  baseFreqs.forEach((freq) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.value = freq;

    // Add subtle vibrato
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 4;
    lfoGain.gain.value = 2;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    lfo.start(now);

    filter.type = 'lowpass';
    filter.frequency.value = 800;

    // Slow envelope
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.04, now + 0.8);
    gain.gain.setValueAtTime(0.04, now + 2);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 3);

    osc.connect(filter);
    filter.connect(gain);

    // Add reverb
    const reverb = getReverb();
    if (reverb) {
      const wetGain = ctx.createGain();
      wetGain.gain.value = 0.5;
      gain.connect(reverb);
      reverb.connect(wetGain);
      wetGain.connect(ctx.destination);
    }
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 3.5);
    lfo.stop(now + 3.5);
  });

  // Add shimmer
  setTimeout(() => playShimmer(1500, 0.6), 1000);
}

/**
 * Play celestial chime (for positive verdicts)
 */
export function playCoin(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  // Bright, uplifting chime
  const notes = [1047, 1319, 1568]; // C6, E6, G6

  notes.forEach((freq, i) => {
    setTimeout(() => {
      playEtherealTone(freq, 0.5, 0.08, 0.01, 0.4);
    }, i * 50);
  });

  // Shimmer overlay
  setTimeout(() => playShimmer(4000, 0.4), 100);
}

/**
 * Play somber tone (for negative verdicts)
 */
export function playDoom(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  // Descending minor sequence
  const notes = [392, 349, 311, 294]; // G4, F4, Eb4, D4

  notes.forEach((freq, i) => {
    setTimeout(() => {
      playEtherealTone(freq, 0.5, 0.08, 0.05, 0.35);
    }, i * 200);
  });

  // Low rumble
  setTimeout(() => {
    playEtherealTone(73, 1.2, 0.06, 0.2, 0.8); // D2 - deep bass
  }, 300);
}

/**
 * Play verdict sound based on verdict type
 */
export function playVerdictSound(verdict: string): void {
  switch (verdict) {
    case 'HARD_YES':
      playCoin();
      setTimeout(playSuccess, 200);
      break;
    case 'SOFT_YES':
      playSuccess();
      break;
    case 'NEUTRAL':
      playMysticPad();
      break;
    case 'SOFT_NO':
      playEtherealTone(330, 0.6, 0.1, 0.1, 0.4); // E4 - contemplative
      break;
    case 'HARD_NO':
      playDoom();
      break;
    default:
      playReveal();
  }
}
