/**
 * Furniture & appliances for home — affects sleep, meals, spoilage, chill.
 */

export type FurnitureCategory = 'bed' | 'fridge' | 'stove' | 'decoration' | 'tv' | 'desk';

export interface FurnitureItem {
  id: string;
  name: string;
  description: string;
  cost: number;
  category: FurnitureCategory;
  icon: string;
  /** Extra energy per hour of sleep (bed) */
  sleepEnergyPerHour?: number;
  /** Extra hunger when eating a home meal (stove) */
  eatHungerBonus?: number;
  /** Applied each in-game day you own this fridge (cheap = downside) */
  dailyHappinessPenalty?: number;
  dailyHungerPenalty?: number;
  dailyHappinessBonus?: number;
  /** Bonus happiness per hour of chill (decoration) */
  chillHappinessPerHour?: number;
  /** Max meal portions this fridge can store */
  fridgeCapacity?: number;
  /** Happiness gained per hour while watching TV */
  watchHappinessPerHour?: number;
}

export const FURNITURE_ITEMS: FurnitureItem[] = [
  {
    id: 'bed-futon',
    name: 'Futon',
    description: 'Basic sleep. It is uncomfortable and slightly hurts recovery.',
    cost: 180,
    category: 'bed',
    icon: '🛏️',
    sleepEnergyPerHour: -2,
  },
  {
    id: 'bed-queen',
    name: 'Standard bed',
    description: 'Neutral sleep quality. No bonus or penalty.',
    cost: 650,
    category: 'bed',
    icon: '🛌',
    sleepEnergyPerHour: 0,
  },
  {
    id: 'bed-luxury',
    name: 'Luxury bed',
    description: 'Premium comfort for excellent recovery.',
    cost: 1800,
    category: 'bed',
    icon: '🛌',
    sleepEnergyPerHour: 5,
  },
  {
    id: 'fridge-mini',
    name: 'Mini fridge',
    description: 'Stops spoilage. Holds up to 5 meal portions. Buzzes loudly — hurts mood a bit.',
    cost: 220,
    category: 'fridge',
    icon: '🧊',
    fridgeCapacity: 5,
    dailyHappinessPenalty: 0.5,
    dailyHungerPenalty: 0.25,
  },
  {
    id: 'fridge-standard',
    name: 'Standard fridge',
    description: 'Keeps food fresh. Holds up to 8 meal portions.',
    cost: 480,
    category: 'fridge',
    icon: '🧃',
    fridgeCapacity: 8,
  },
  {
    id: 'fridge-french',
    name: 'French-door fridge',
    description: 'Premium cooling. Holds up to 10 meal portions. Small happiness boost.',
    cost: 1200,
    category: 'fridge',
    icon: '❄️',
    fridgeCapacity: 10,
    dailyHappinessBonus: 0.35,
  },
  {
    id: 'stove-hotplate',
    name: 'Hot plate',
    description: 'Cook better meals at home.',
    cost: 95,
    category: 'stove',
    icon: '🔥',
    eatHungerBonus: 3,
  },
  {
    id: 'stove-gas',
    name: 'Gas range',
    description: 'Serious cooking — meals fill you up more.',
    cost: 520,
    category: 'stove',
    icon: '🍳',
    eatHungerBonus: 8,
  },
  {
    id: 'desk-basic',
    name: 'Study desk',
    description: 'A proper desk for studying and getting work done.',
    cost: 160,
    category: 'desk',
    icon: '🪑',
  },
  {
    id: 'decor-plant',
    name: 'House plants',
    description: 'Greenery helps you relax at home.',
    cost: 45,
    category: 'decoration',
    icon: '🪴',
    chillHappinessPerHour: 1,
  },
  {
    id: 'decor-lights',
    name: 'String lights',
    description: 'Cozy vibes when you unwind.',
    cost: 35,
    category: 'decoration',
    icon: '✨',
    chillHappinessPerHour: 0.75,
  },
  {
    id: 'decor-art',
    name: 'Wall art',
    description: 'Inspiration while you lounge.',
    cost: 120,
    category: 'decoration',
    icon: '🖼️',
    chillHappinessPerHour: 2,
  },
  {
    id: 'tv-antique',
    name: 'Black & white TV',
    description: 'Retro shows. Low happiness per hour watched.',
    cost: 85,
    category: 'tv',
    icon: '📺',
    watchHappinessPerHour: 1,
  },
  {
    id: 'tv-crt',
    name: 'CRT color TV',
    description: 'Cable and snacks. Decent mood lift.',
    cost: 320,
    category: 'tv',
    icon: '📺',
    watchHappinessPerHour: 4,
  },
  {
    id: 'tv-plasma',
    name: 'Flat plasma screen',
    description: 'Cinema at home. Up to +10 happiness per hour.',
    cost: 1400,
    category: 'tv',
    icon: '🖥️',
    watchHappinessPerHour: 10,
  },
];

export const FURNITURE_BY_ID: Record<string, FurnitureItem> = Object.fromEntries(
  FURNITURE_ITEMS.map((i) => [i.id, i])
);

export interface HomeFurnitureState {
  bedId: string | null;
  fridgeId: string | null;
  stoveId: string | null;
  deskId: string | null;
  tvId: string | null;
  decorationIds: string[];
}

export const EMPTY_HOME_FURNITURE: HomeFurnitureState = {
  bedId: null,
  fridgeId: null,
  stoveId: null,
  deskId: null,
  tvId: null,
  decorationIds: [],
};

/** Parents' house: your room has a normal bed; shared kitchen has a standard fridge (spoil rules still use live-with-parents Infinity cap in game logic). */
export const LIVE_WITH_PARENTS_DEFAULT_FURNITURE: HomeFurnitureState = {
  bedId: 'bed-queen',
  fridgeId: 'fridge-standard',
  stoveId: null,
  deskId: 'desk-basic',
  tvId: null,
  decorationIds: [],
};

export function getSleepEnergyBonusPerHour(f: HomeFurnitureState): number {
  const bed = f.bedId ? FURNITURE_BY_ID[f.bedId] : null;
  // No bed is intentionally harsh.
  if (!bed) return -5;
  return bed.sleepEnergyPerHour ?? 0;
}

export function getEatHungerBonus(f: HomeFurnitureState): number {
  const stove = f.stoveId ? FURNITURE_BY_ID[f.stoveId] : null;
  return stove?.eatHungerBonus ?? 0;
}

export function hasFridge(f: HomeFurnitureState): boolean {
  return f.fridgeId != null;
}

export function hasDesk(f: HomeFurnitureState): boolean {
  return f.deskId != null;
}

export function getFridgeMealCapacity(fridgeId: string | null): number | null {
  if (!fridgeId) return null;
  const item = FURNITURE_BY_ID[fridgeId];
  return item?.fridgeCapacity ?? null;
}

export function getWatchHappinessPerHour(f: HomeFurnitureState): number {
  if (!f.tvId) return 0;
  const tv = FURNITURE_BY_ID[f.tvId];
  return tv?.watchHappinessPerHour ?? 0;
}

export function getFridgeDailyEffects(f: HomeFurnitureState): {
  happiness: number;
  hunger: number;
} {
  if (!hasFridge(f)) return { happiness: 0, hunger: 0 };
  const fr = FURNITURE_BY_ID[f.fridgeId!];
  if (!fr) return { happiness: 0, hunger: 0 };
  return {
    happiness: (fr.dailyHappinessBonus ?? 0) - (fr.dailyHappinessPenalty ?? 0),
    hunger: -(fr.dailyHungerPenalty ?? 0),
  };
}

export function getChillHappinessPerHour(f: HomeFurnitureState): number {
  return f.decorationIds.reduce((sum, id) => {
    const d = FURNITURE_BY_ID[id];
    return sum + (d?.chillHappinessPerHour ?? 0);
  }, 0);
}
