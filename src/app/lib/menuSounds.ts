/**
 * Menu theme stingers (Web Audio API — no asset files).
 * Longer, melody + pad — closer to a short music cue than a single blip.
 * Call `unlockMenuAudio()` on first pointerdown so browsers allow playback.
 */

let menuAudioCtx: AudioContext | null = null;

export function getMenuAudioContext(): AudioContext {
  if (!menuAudioCtx) {
    menuAudioCtx = new AudioContext();
  }
  return menuAudioCtx;
}

export async function unlockMenuAudio(): Promise<void> {
  const ctx = getMenuAudioContext();
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }
}

/** Intro menu card motion (LifeSimGame) — keep `playMenuEnterSound` scaled to this total. */
export const INTRO_MENU_FADE_DELAY_SEC = 0.36;
export const INTRO_MENU_FADE_DURATION_SEC = 2.3;
export const INTRO_MENU_FADE_TOTAL_SEC =
  INTRO_MENU_FADE_DELAY_SEC + INTRO_MENU_FADE_DURATION_SEC;

function note(
  ctx: AudioContext,
  startTime: number,
  frequency: number,
  duration: number,
  gainPeak: number,
  type: OscillatorType = 'sine',
  attack = 0.02
): void {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, startTime);
  const a = Math.max(0.005, attack);
  g.gain.setValueAtTime(0.0001, startTime);
  g.gain.exponentialRampToValueAtTime(gainPeak, startTime + a);
  g.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.08);
}

/** Soft sustained bed (multiple sines) — “music pad” */
function padLayer(
  ctx: AudioContext,
  t0: number,
  duration: number,
  freqs: number[],
  peakPerOsc: number,
  timeScale = 1
): void {
  const rise = 0.45 * timeScale;
  const fallLead = 0.55 * timeScale;
  freqs.forEach((f) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(f, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peakPerOsc, t0 + rise);
    g.gain.setValueAtTime(peakPerOsc * 0.9, t0 + Math.max(duration - fallLead, rise + 0.02));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.15);
  });
}

/**
 * Plays with the intro menu card fade-in. Length matches `INTRO_MENU_FADE_TOTAL_SEC`.
 * Uplifting C-major line + light harmony + soft low pad.
 */
export function playMenuEnterSound(): void {
  const ctx = getMenuAudioContext();
  const t0 = ctx.currentTime + 0.02;
  /** Original phrase end (~shimmer tail) — scale so cue fits `INTRO_MENU_FADE_TOTAL_SEC`. */
  const originalPhraseEndSec = 5.15;
  const s = INTRO_MENU_FADE_TOTAL_SEC / originalPhraseEndSec;

  const padEnd = 4.4 * s;
  padLayer(ctx, t0, padEnd, [130.81, 196.0, 261.63], 0.028, s); // C3, G3, C4

  const atk = Math.max(0.012, 0.04 * s);
  const fifthAtk = Math.max(0.02, 0.08 * s);

  // Main melody: rising C major / pentatonic feel
  const melody: { f: number; at: number; len: number; g: number }[] = [
    { f: 523.25, at: 0.15, len: 0.42, g: 0.09 }, // C5
    { f: 587.33, at: 0.55, len: 0.42, g: 0.085 }, // D5
    { f: 659.25, at: 0.95, len: 0.45, g: 0.09 }, // E5
    { f: 783.99, at: 1.38, len: 0.48, g: 0.095 }, // G5
    { f: 880.0, at: 1.85, len: 0.5, g: 0.09 }, // A5
    { f: 1046.5, at: 2.35, len: 0.55, g: 0.1 }, // C6
    { f: 1174.66, at: 2.9, len: 0.55, g: 0.095 }, // D6
    { f: 1318.51, at: 3.45, len: 0.65, g: 0.1 }, // E6
    { f: 1567.98, at: 4.05, len: 0.75, g: 0.09 }, // G6
  ];
  for (const m of melody) {
    const at = m.at * s;
    const len = m.len * s;
    note(ctx, t0 + at, m.f, len, m.g, 'triangle', atk);
    note(ctx, t0 + at + 0.04 * s, m.f / 1.5, len * 0.92, m.g * 0.42, 'sine', fifthAtk);
  }

  // Closing shimmer
  note(ctx, t0 + 4.55 * s, 2093.0, 0.55 * s, 0.045, 'sine', 0.06 * s);
  note(ctx, t0 + 4.62 * s, 2637.02, 0.5 * s, 0.035, 'sine', 0.05 * s);
}

/**
 * Longer descending line + low resolution when leaving the menu (~3s).
 */
export function playMenuExitSound(): void {
  const ctx = getMenuAudioContext();
  const t0 = ctx.currentTime + 0.02;

  const walkDown = [
    { f: 1318.51, t: 0, len: 0.38, g: 0.09 },
    { f: 1174.66, t: 0.28, len: 0.38, g: 0.085 },
    { f: 1046.5, t: 0.56, len: 0.4, g: 0.085 },
    { f: 987.77, t: 0.86, len: 0.4, g: 0.08 },
    { f: 880.0, t: 1.15, len: 0.42, g: 0.078 },
    { f: 783.99, t: 1.48, len: 0.45, g: 0.075 },
    { f: 698.46, t: 1.82, len: 0.48, g: 0.072 },
    { f: 659.25, t: 2.18, len: 0.52, g: 0.07 },
    { f: 587.33, t: 2.55, len: 0.55, g: 0.065 },
    { f: 523.25, t: 2.92, len: 0.6, g: 0.062 },
    { f: 392.0, t: 3.35, len: 0.75, g: 0.055 },
    { f: 261.63, t: 3.85, len: 0.9, g: 0.05 },
  ];
  for (const n of walkDown) {
    note(ctx, t0 + n.t, n.f, n.len, n.g, n.t < 1.0 ? 'triangle' : 'sine', 0.05);
  }

  padLayer(ctx, t0 + 1.1, 2.85, [98.0, 146.83, 196.0], 0.022);
}

/** `.` `!` `?` … — typed character before a dialogue pause (slightly different timbre). */
const SENTENCE_END_CHARS = new Set(['.', '!', '?', '…', '。']);

function charKeyFlavor(char: string): {
  fMul: number;
  durMul: number;
  gainMul: number;
  squareMix: number;
} {
  const code = char.charCodeAt(0);
  const spread = (code % 89) / 89;

  if (char === ' ' || char === '\t') {
    return { fMul: 0.55, durMul: 1.35, gainMul: 0.55, squareMix: 0.35 };
  }
  if (/\d/.test(char)) {
    return { fMul: 1.22 + spread * 0.08, durMul: 0.95, gainMul: 1.05, squareMix: 0.85 };
  }
  if (/[aeiouAEIOU]/.test(char)) {
    return { fMul: 1.08 + spread * 0.06, durMul: 1.12, gainMul: 1.02, squareMix: 0.65 };
  }
  if (SENTENCE_END_CHARS.has(char)) {
    return { fMul: 0.68 + spread * 0.05, durMul: 1.25, gainMul: 0.85, squareMix: 0.45 };
  }
  if (/[,.;:'"–\-—()[\]{}]/.test(char)) {
    return { fMul: 0.82, durMul: 0.9, gainMul: 0.78, squareMix: 0.55 };
  }
  return { fMul: 0.92 + spread * 0.12, durMul: 1, gainMul: 1, squareMix: 0.72 };
}

export type RetroKeyClickOptions = { gainScale?: number };

/**
 * Short mechanical “key” click for story dialogue typewriter (Web Audio — no asset files).
 * Timbre shifts by letter type; deterministic spread per character for variety.
 */
export function playRetroKeyClick(char?: string, opts?: RetroKeyClickOptions): void {
  const ctx = getMenuAudioContext();
  void ctx.resume();
  if (char === '\n' || char === '\r') return;

  const gainScale = opts?.gainScale ?? 1;
  const flavor = char ? charKeyFlavor(char) : { fMul: 1, durMul: 1, gainMul: 1, squareMix: 0.7 };
  const t0 = ctx.currentTime + 0.001;
  const base = (420 + (char ? char.charCodeAt(0) % 37 : 0) * 5.5) * flavor.fMul;
  const duration = (0.013 + (char ? (char.charCodeAt(0) % 11) * 0.0009 : 0.006)) * flavor.durMul;
  const peak =
    (0.022 + (char ? (char.charCodeAt(0) % 7) * 0.0018 : 0.008)) * flavor.gainMul * gainScale;

  const f1 = base;
  const f2 = f1 * (1.22 + (char ? (char.charCodeAt(0) % 5) * 0.02 : 0.1));

  const blip = (
    freq: number,
    delay: number,
    len: number,
    g: number,
    type: OscillatorType,
    mix: number
  ) => {
    if (g * mix < 0.003) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0 + delay);
    gain.gain.setValueAtTime(0.0001, t0 + delay);
    gain.gain.exponentialRampToValueAtTime(g * mix, t0 + delay + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + delay + len);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0 + delay);
    osc.stop(t0 + delay + len + 0.06);
  };

  const sq = flavor.squareMix;
  blip(f1, 0, duration, peak, 'square', sq);
  blip(f2, 0.002, duration * 0.55, peak, 'triangle', 0.42 * (1 - sq * 0.35));
  if (char && /[aeiouAEIOU0-9]/.test(char)) {
    blip(f1 * 2.02, 0.001, duration * 0.35, peak * 0.12, 'sine', 1);
  }
}
