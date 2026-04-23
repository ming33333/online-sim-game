/**
 * Backpacks (capacity in space units) and portable snacks from the grocery store.
 */

export type BackpackId = 'pack-1' | 'pack-5' | 'pack-10';

export interface BackpackType {
  id: BackpackId;
  name: string;
  description: string;
  capacity: number;
  cost: number;
}

export const BACKPACK_TYPES: BackpackType[] = [
  {
    id: 'pack-1',
    name: 'Pouch',
    description: 'Fits a few small items.',
    capacity: 2,
    cost: 36,
  },
  {
    id: 'pack-5',
    name: 'Day pack',
    description: 'Room for snacks and small gear.',
    capacity: 10,
    cost: 104,
  },
  {
    id: 'pack-10',
    name: 'Hiker pack',
    description: 'Maximum carry space.',
    capacity: 20,
    cost: 196,
  },
];

export const BACKPACK_BY_ID: Record<BackpackId, BackpackType> = Object.fromEntries(
  BACKPACK_TYPES.map((b) => [b.id, b])
) as Record<BackpackId, BackpackType>;

export function getBackpackCapacity(backpackId: BackpackId | null): number {
  if (!backpackId) return 0;
  return BACKPACK_BY_ID[backpackId].capacity;
}

export type SnackId = 'snack-5' | 'snack-8' | 'snack-10' | 'snack-20';

export interface SnackType {
  id: SnackId;
  label: string;
  hunger: number;
  /** Space units one snack item occupies in the backpack */
  spaceUnits: number;
  cost: number;
  /** If true, only sold at the gym vending area (not grocery snack wall). */
  gymOnly?: boolean;
}

export const SNACK_TYPES: SnackType[] = [
  { id: 'snack-5', label: 'Crackers', hunger: 5, spaceUnits: 1, cost: 2.5 },
  { id: 'snack-8', label: 'Chips', hunger: 8, spaceUnits: 1, cost: 3.5, gymOnly: true },
  { id: 'snack-10', label: 'Protein bar', hunger: 10, spaceUnits: 1, cost: 5 },
  { id: 'snack-20', label: 'Beef jerky', hunger: 20, spaceUnits: 2, cost: 11 },
];

/** Gym vending (not the grocery wall). */
export const GYM_SNACK_OFFERS: { snackId: SnackId; price: number }[] = [
  { snackId: 'snack-10', price: 6 },
  { snackId: 'snack-5', price: 3.5 },
  { snackId: 'snack-8', price: 4 },
];

export const SNACK_BY_ID: Record<SnackId, SnackType> = Object.fromEntries(
  SNACK_TYPES.map((s) => [s.id, s])
) as Record<SnackId, SnackType>;

export const EMPTY_SNACK_COUNTS: Record<SnackId, number> = {
  'snack-5': 0,
  'snack-8': 0,
  'snack-10': 0,
  'snack-20': 0,
};

export function getUsedSnackSpace(counts: Record<SnackId, number>): number {
  return SNACK_TYPES.reduce((sum, s) => sum + (counts[s.id] ?? 0) * s.spaceUnits, 0);
}

/** Space units for one prepared to-go meal in the backpack */
export const TOGO_MEAL_SPACE_UNITS = 2;

export function getUsedBackpackSpace(
  snackCounts: Record<SnackId, number>,
  togoCarried: { regular: number; lux: number }
): number {
  return getUsedSnackSpace(snackCounts) + TOGO_MEAL_SPACE_UNITS * (togoCarried.regular + togoCarried.lux);
}
