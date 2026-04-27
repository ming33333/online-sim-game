/** Round to at most 2 decimal places (half-up). */
export function round2(n: number): number {
  return Math.round(Number(n) * 100) / 100;
}

/** Display any game float with exactly 2 decimals (after rounding). */
export function fmt2(n: number): string {
  return round2(n).toFixed(2);
}

/** 0–10 player skills (beauty, smarts, fitness, social): "7.00/10.00" */
export function fmtStatOutOfTen(value: number): string {
  return `${fmt2(value)}`;
}

/** Money: commas + always 2 decimal places. */
export function formatMoney(n: number): string {
  return round2(n).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
