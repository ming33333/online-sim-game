import { DAYS_PER_SEASON } from './constants';

/** Last calendar day of each 28-day season — full moon on the in-game calendar. */
export function isFullMoonCalendarDay(dayOfYear: number): boolean {
  return dayOfYear > 0 && dayOfYear % DAYS_PER_SEASON === 0;
}

/** Night for ambience / celestial events — matches gameBackground (20:00–04:00). */
export function isNightHour(hourOfDay: number): boolean {
  const h = ((hourOfDay % 24) + 24) % 24;
  return h >= 20 || h < 4;
}
