/**
 * Home groceries split between fridge (protected) and counter (spoils without unlimited fridge).
 */

export type MealBuckets = { regular: number; lux: number };

export type GroceryBucketsState = { fridge: MealBuckets; counter: MealBuckets };

export const EMPTY_GROCERY_BUCKETS: GroceryBucketsState = {
  fridge: { regular: 0, lux: 0 },
  counter: { regular: 0, lux: 0 },
};

/** Merge to fridge (infinite cap), then add free regular meals until total portions reach `mealCapacity` (parents' pantry). */
export function topUpParentsFridge(
  buckets: GroceryBucketsState,
  mealCapacity: number
): GroceryBucketsState {
  const merged = rebalanceGroceriesToFridge(buckets.fridge, buckets.counter, Number.POSITIVE_INFINITY);
  const r = merged.fridge.regular;
  const l = merged.fridge.lux;
  const total = r + l;
  if (total >= mealCapacity) return merged;
  return {
    fridge: { regular: r + (mealCapacity - total), lux: l },
    counter: { regular: 0, lux: 0 },
  };
}

/** cap 0 = no fridge protection; Infinity = all meals stay fresh (e.g. living with parents) */
export function rebalanceGroceriesToFridge(
  fridge: MealBuckets,
  counter: MealBuckets,
  cap: number
): GroceryBucketsState {
  const r = fridge.regular + counter.regular;
  const l = fridge.lux + counter.lux;
  if (cap <= 0) {
    return { fridge: { regular: 0, lux: 0 }, counter: { regular: r, lux: l } };
  }
  if (!Number.isFinite(cap) || cap >= r + l) {
    return { fridge: { regular: r, lux: l }, counter: { regular: 0, lux: 0 } };
  }
  let room = cap;
  const fr = Math.min(r, room);
  room -= fr;
  const fl = Math.min(l, room);
  return {
    fridge: { regular: fr, lux: fl },
    counter: { regular: r - fr, lux: l - fl },
  };
}

/** Eat counter (spoiling) meals before fridge (protected) meals. */
export function consumeOneHomeMeal(buckets: GroceryBucketsState, type: 'regular' | 'lux'): GroceryBucketsState | null {
  const key = type;
  if (buckets.counter[key] > 0) {
    return {
      ...buckets,
      counter: { ...buckets.counter, [key]: buckets.counter[key] - 1 },
    };
  }
  if (buckets.fridge[key] > 0) {
    return {
      ...buckets,
      fridge: { ...buckets.fridge, [key]: buckets.fridge[key] - 1 },
    };
  }
  return null;
}

/** Spoil UI: 0–100% (100 = fully fresh; at 0% the next spoil tick wastes ~half). */
export function clampFreshnessPct(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}
