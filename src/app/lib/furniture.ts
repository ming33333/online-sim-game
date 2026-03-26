/**
 * Furniture & appliances for home — affects sleep, meals, spoilage, chill.
 */

export type FurnitureCategory = 'bed' | 'fridge' | 'stove' | 'decoration';

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
}

export const FURNITURE_ITEMS: FurnitureItem[] = [
  {
    id: 'bed-futon',
    name: 'Futon',
    description: 'Basic sleep. Slightly better rest.',
    cost: 180,
    category: 'bed',
    icon: '🛏️',
    sleepEnergyPerHour: 2,
  },
  {
    id: 'bed-queen',
    name: 'Queen mattress',
    description: 'Comfortable sleep restores more energy.',
    cost: 650,
    category: 'bed',
    icon: '🛌',
    sleepEnergyPerHour: 5,
  },
  {
    id: 'fridge-mini',
    name: 'Mini fridge',
    description: 'Stops spoilage. Buzzes loudly — hurts mood a bit.',
    cost: 220,
    category: 'fridge',
    icon: '🧊',
    dailyHappinessPenalty: 0.5,
    dailyHungerPenalty: 0.25,
  },
  {
    id: 'fridge-standard',
    name: 'Standard fridge',
    description: 'Keeps food fresh. No drawbacks.',
    cost: 480,
    category: 'fridge',
    icon: '🧃',
  },
  {
    id: 'fridge-french',
    name: 'French-door fridge',
    description: 'Premium cooling. Small happiness boost from a nice kitchen.',
    cost: 1200,
    category: 'fridge',
    icon: '❄️',
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
];

export const FURNITURE_BY_ID: Record<string, FurnitureItem> = Object.fromEntries(
  FURNITURE_ITEMS.map((i) => [i.id, i])
);

export interface HomeFurnitureState {
  bedId: string | null;
  fridgeId: string | null;
  stoveId: string | null;
  decorationIds: string[];
}

export const EMPTY_HOME_FURNITURE: HomeFurnitureState = {
  bedId: null,
  fridgeId: null,
  stoveId: null,
  decorationIds: [],
};

export function getSleepEnergyBonusPerHour(f: HomeFurnitureState): number {
  const bed = f.bedId ? FURNITURE_BY_ID[f.bedId] : null;
  return bed?.sleepEnergyPerHour ?? 0;
}

export function getEatHungerBonus(f: HomeFurnitureState): number {
  const stove = f.stoveId ? FURNITURE_BY_ID[f.stoveId] : null;
  return stove?.eatHungerBonus ?? 0;
}

export function hasFridge(f: HomeFurnitureState): boolean {
  return f.fridgeId != null;
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
