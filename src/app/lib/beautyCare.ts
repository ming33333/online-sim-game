/**
 * Skincare (grocery), hair salon, and workout-linked beauty helpers.
 */

import { round2, fmt2 } from './formatNumber';

export type SkincareId = 'gentle-cleanser' | 'vitamin-serum' | 'night-repair';

export const SKINCARE_PRODUCTS: {
  id: SkincareId;
  name: string;
  description: string;
  cost: number;
  /** Beauty gain when auto-applied (once per in-game day per product, while doses remain). */
  dailyBeauty: number;
  dosesPerPurchase: number;
}[] = [
  {
    id: 'gentle-cleanser',
    name: 'Gentle daily cleanser',
    description: 'Basic skincare — auto-applied each morning while you have supply (1×/day max per product).',
    cost: 16,
    dailyBeauty: 0.03,
    dosesPerPurchase: 14,
  },
  {
    id: 'vitamin-serum',
    name: 'Vitamin C serum',
    description: 'Brightening care — auto-applied daily while in stock (1×/day max per product).',
    cost: 38,
    dailyBeauty: 0.055,
    dosesPerPurchase: 14,
  },
  {
    id: 'night-repair',
    name: 'Night repair cream',
    description: 'Rich overnight care — auto-applied daily while in stock (1×/day max per product).',
    cost: 72,
    dailyBeauty: 0.08,
    dosesPerPurchase: 14,
  },
];

export function emptySkincareDoses(): Record<SkincareId, number> {
  return { 'gentle-cleanser': 0, 'vitamin-serum': 0, 'night-repair': 0 };
}

/** Mutates `doses`. Run once per in-game calendar day crossed. */
export function applySkincareForNewDay(
  doses: Record<SkincareId, number>
): { totalBeauty: number; message: string | null } {
  const names: string[] = [];
  let total = 0;
  for (const p of SKINCARE_PRODUCTS) {
    if (doses[p.id] > 0) {
      doses[p.id] -= 1;
      total += p.dailyBeauty;
      names.push(p.name);
    }
  }
  if (names.length === 0) return { totalBeauty: 0, message: null };
  const totalBeauty = round2(total);
  const message = `Skincare (auto, 1×/day per product): ${names.join('; ')}. Beauty +${fmt2(totalBeauty)}.`;
  return { totalBeauty, message };
}

/** Chance of a small beauty boost scales with hours (10% per hour, cap 100%). */
export const WORKOUT_BEAUTY_CHANCE_PER_HOUR = 0.1;
export const WORKOUT_BEAUTY_GAIN = 0.045;

export function rollWorkoutBeautyDelta(hours: number, rng: () => number = Math.random): number {
  const p = Math.min(1, WORKOUT_BEAUTY_CHANCE_PER_HOUR * hours);
  if (rng() < p) return WORKOUT_BEAUTY_GAIN;
  return 0;
}

export type HaircutId = 'budget' | 'regular' | 'luxury';

export const HAIRCUT_OPTIONS: {
  id: HaircutId;
  label: string;
  cost: number;
  /** Chance beauty goes down (higher on budget cuts). */
  pDown: number;
  /** Chance beauty goes up (luxury = highest). */
  pUp: number;
  beautyUp: number;
  beautyDown: number;
}[] = [
  {
    id: 'budget',
    label: 'Quick trim (budget)',
    cost: 22,
    pDown: 0.16,
    pUp: 0.22,
    beautyUp: 0.06,
    beautyDown: 0.07,
  },
  {
    id: 'regular',
    label: 'Cut & style',
    cost: 55,
    pDown: 0.05,
    pUp: 0.38,
    beautyUp: 0.1,
    beautyDown: 0.04,
  },
  {
    id: 'luxury',
    label: 'Signature salon',
    cost: 118,
    pDown: 0,
    pUp: 0.55,
    beautyUp: 0.15,
    beautyDown: 0,
  },
];

const DEFAULT_CALENDAR_START_YEAR = 2000;
const DEFAULT_DAYS_PER_YEAR = 112;

/** One haircut per 7 in-game days; `last` is the calendar day the last cut started. */
export function haircutCooldownStatus(
  lastYear: number | null,
  lastDayOfYear: number | null,
  year: number,
  dayOfYear: number,
  calendarStartYear: number = DEFAULT_CALENDAR_START_YEAR,
  daysPerYear: number = DEFAULT_DAYS_PER_YEAR
): {
  canCut: boolean;
  daysRemaining: number;
  nextYear: number;
  nextDayOfYear: number;
} {
  if (lastYear == null || lastDayOfYear == null) {
    return { canCut: true, daysRemaining: 0, nextYear: year, nextDayOfYear: dayOfYear };
  }
  const idx = (y: number, d: number) => (y - calendarStartYear) * daysPerYear + (d - 1);
  const lastI = idx(lastYear, lastDayOfYear);
  const nowI = idx(year, dayOfYear);
  const passed = nowI - lastI;
  if (passed >= 7) {
    return { canCut: true, daysRemaining: 0, nextYear: year, nextDayOfYear: dayOfYear };
  }
  const daysRemaining = 7 - passed;
  const nextI = lastI + 7;
  const nextYear = calendarStartYear + Math.floor(nextI / daysPerYear);
  const nextDayOfYear = (nextI % daysPerYear) + 1;
  return { canCut: false, daysRemaining, nextYear, nextDayOfYear };
}

export function rollHaircutBeautyDelta(
  id: HaircutId,
  rng: () => number = Math.random
): { delta: number; flavor: 'up' | 'down' | 'same' } {
  const opt = HAIRCUT_OPTIONS.find((h) => h.id === id);
  if (!opt) return { delta: 0, flavor: 'same' };
  const r = rng();
  if (opt.pDown > 0 && r < opt.pDown) {
    return { delta: -opt.beautyDown, flavor: 'down' };
  }
  if (r < opt.pDown + opt.pUp) {
    return { delta: opt.beautyUp, flavor: 'up' };
  }
  return { delta: 0, flavor: 'same' };
}
