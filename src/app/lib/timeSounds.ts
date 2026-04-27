/**
 * Small UI sound for time tick / hub updates.
 * Uses the same AudioContext as menu sounds (Web Audio; no asset files).
 */

import { getMenuAudioContext } from './menuSounds';

export function playTimeSwooshSound(): void {
  const ctx = getMenuAudioContext();
  void ctx.resume();

  const t0 = ctx.currentTime + 0.001;

  // Noise burst through a short bandpass sweep = "swoosh"
  const dur = 0.12;
  const noiseBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
  const data = noiseBuf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.6;

  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;

  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.Q.setValueAtTime(10, t0);
  band.frequency.setValueAtTime(1200, t0);
  band.frequency.exponentialRampToValueAtTime(420, t0 + dur);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(1.0, t0 + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  src.connect(band);
  band.connect(gain);
  gain.connect(ctx.destination);

  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

