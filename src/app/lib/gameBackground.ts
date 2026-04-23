/**
 * Seasonal gradient + time-of-day brightness for the main game shell.
 * Day 1–112: Spring, Summer, Fall, Winter (28 days each).
 */

import type { CSSProperties } from 'react';

const SEASONS = ['Spring', 'Summer', 'Fall', 'Winter'] as const;

/** Public assets — spring & summer use art instead of CSS gradients. */
const SPRING_BACKGROUND_URL = '/assets/backgrounds/spring.png';
const SUMMER_BACKGROUND_URL = '/assets/backgrounds/summer.png';

export function getSeasonIndex(dayOfYear: number): number {
  return Math.min(3, Math.floor((Math.max(1, dayOfYear) - 1) / 28));
}

export function getSeasonName(dayOfYear: number): (typeof SEASONS)[number] {
  return SEASONS[getSeasonIndex(dayOfYear)];
}

/** CSS linear-gradient string (no brightness overlay). */
export function getSeasonGradient(dayOfYear: number): string {
  const s = getSeasonIndex(dayOfYear);
  // Spring: pink & orange · Summer: red & orange · Fall: amber & rust · Winter: icy blue & slate
  const gradients: [string, string, string][] = [
    ['#fce7f3', '#fed7aa', '#fbcfe8'], // spring pink / peach / rose
    ['#fecaca', '#fdba74', '#fca5a5'], // summer red / orange / coral
    ['#fde68a', '#d97706', '#b45309'], // fall gold / amber / brown
    ['#e0f2fe', '#cbd5e1', '#94a3b8'], // winter sky / slate / cool gray
  ];
  const [a, b, c] = gradients[s];
  return `linear-gradient(135deg, ${a} 0%, ${b} 45%, ${c} 100%)`;
}

const imageBackground = (url: string, fallbackColor: string): CSSProperties => ({
  backgroundColor: fallbackColor,
  backgroundImage: `url(${url})`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',
});

/** Full-area background for the main shell: spring/summer images, other seasons gradient. */
export function getSeasonShellBackgroundStyle(dayOfYear: number): CSSProperties {
  const s = getSeasonIndex(dayOfYear);
  if (s === 0) return imageBackground(SPRING_BACKGROUND_URL, '#fce7f3');
  if (s === 1) return imageBackground(SUMMER_BACKGROUND_URL, '#fecaca');
  return { background: getSeasonGradient(dayOfYear) };
}

/**
 * Multiplier 0–1 for darkening the view (multiplied with rgba overlay alpha).
 * 8:00–16:00 brightest · 16:00–20:00 dusk · 20:00–04:00 night · 04:00–08:00 dawn
 */
export function getTimeDimFactor(hourOfDay: number): number {
  const h = ((hourOfDay % 24) + 24) % 24;
  if (h >= 8 && h < 16) return 0;
  if (h >= 4 && h < 8) return (8 - h) / 4; // 1 → 0 brighter toward 8am
  if (h >= 16 && h < 20) return (h - 16) / 4; // 0 → 1 darker toward 8pm
  return 1; // night
}

/** rgba black overlay alpha for dimming (0 = bright, ~0.55 max night) */
export function getTimeOverlayAlpha(hourOfDay: number): number {
  return getTimeDimFactor(hourOfDay) * 0.52;
}
