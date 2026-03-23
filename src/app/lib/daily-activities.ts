/**
 * Real-time daily activities - 3 per day, based on real-world date.
 * Resets when user logs in for the first time each calendar day.
 */

const STORAGE_KEY_LAST_DAILY = 'lifesim_last_daily_date';
const STORAGE_KEY_DAILY_DATA = 'lifesim_daily_activities';

export type DailyRewardType = 'money' | 'fun_item' | 'food';

export interface DailyActivity {
  id: string;
  name: string;
  description: string;
  rewardType: DailyRewardType;
  /** For money: amount. For food: meals count. For fun_item: item id. */
  rewardValue: number | string;
  /** Display label for reward (e.g. "$50", "1 luxury meal", "Rubik's Cube") */
  rewardLabel: string;
}

export interface DailyState {
  date: string; // YYYY-MM-DD
  activities: DailyActivity[];
  completedIds: Set<string>;
}

/** Simple seeded PRNG for deterministic daily generation from date */
function seededRandom(seed: number): () => number {
  return () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

const FUN_ITEMS: { id: string; name: string }[] = [
  { id: 'rubiks', name: "Rubik's Cube" },
  { id: 'sketchbook', name: 'Sketchbook' },
  { id: 'novel', name: 'Mystery Novel' },
  { id: 'board-game', name: 'Board Game' },
  { id: 'plant', name: 'Succulent' },
  { id: 'coffee-mug', name: 'Fancy Coffee Mug' },
  { id: 'poster', name: 'Cool Poster' },
  { id: 'candle', name: 'Scented Candle' },
  { id: 'yoga-mat', name: 'Yoga Mat' },
  { id: 'headphones', name: 'Nice Headphones' },
];

const ACTIVITY_TEMPLATES: Omit<DailyActivity, 'id' | 'rewardValue' | 'rewardLabel'>[] = [
  { name: 'Check in', description: 'Start your day with a quick check-in.', rewardType: 'money' },
  { name: 'Take a stroll', description: 'Go for a short walk around the block.', rewardType: 'food' },
  { name: 'Read something', description: 'Spend 15 minutes reading.', rewardType: 'fun_item' },
  { name: 'Stretch', description: 'Do a few stretches to wake up.', rewardType: 'money' },
  { name: 'Journal', description: 'Write down one thing you\'re grateful for.', rewardType: 'food' },
  { name: 'Listen to music', description: 'Play your favorite song.', rewardType: 'fun_item' },
  { name: 'Call a friend', description: 'Catch up with someone you care about.', rewardType: 'money' },
  { name: 'Try a new recipe', description: 'Cook something different today.', rewardType: 'food' },
  { name: 'Learn something new', description: 'Watch a short educational video.', rewardType: 'fun_item' },
  { name: 'Organize your space', description: 'Tidy up one area of your home.', rewardType: 'money' },
  { name: 'Enjoy a snack', description: 'Treat yourself to a small snack.', rewardType: 'food' },
  { name: 'Creative break', description: 'Doodle, color, or create something.', rewardType: 'fun_item' },
];

function generateActivitiesForDate(dateStr: string): DailyActivity[] {
  const [y, m, d] = dateStr.split('-').map(Number);
  const seed = y * 10000 + m * 100 + d;
  const rng = seededRandom(seed);

  const shuffled = [...ACTIVITY_TEMPLATES].sort(() => rng() - 0.5);
  const chosen = shuffled.slice(0, 3);

  const moneyAmounts = [25, 50, 75, 100, 150];
  const foodAmounts = [1, 2, 3];
  const foodTypes = ['regular', 'luxury'] as const;

  return chosen.map((t, i) => {
    const id = `${dateStr}-${i}`;
    let rewardValue: number | string;
    let rewardLabel: string;

    if (t.rewardType === 'money') {
      const amt = moneyAmounts[Math.floor(rng() * moneyAmounts.length)];
      rewardValue = amt;
      rewardLabel = `$${amt}`;
    } else if (t.rewardType === 'food') {
      const meals = foodAmounts[Math.floor(rng() * foodAmounts.length)];
      const isLux = rng() > 0.5;
      rewardValue = isLux ? -meals : meals; // negative = luxury
      rewardLabel = `${meals} ${isLux ? 'luxury' : 'regular'} meal${meals > 1 ? 's' : ''}`;
    } else {
      const item = FUN_ITEMS[Math.floor(rng() * FUN_ITEMS.length)];
      rewardValue = item.id;
      rewardLabel = item.name;
    }

    return {
      ...t,
      id,
      rewardValue,
      rewardLabel,
    };
  });
}

export function getTodayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getDailyState(): DailyState {
  if (typeof localStorage === 'undefined') {
    const today = getTodayDateString();
    return {
      date: today,
      activities: generateActivitiesForDate(today),
      completedIds: new Set(),
    };
  }

  const today = getTodayDateString();
  const lastDate = localStorage.getItem(STORAGE_KEY_LAST_DAILY);
  const stored = localStorage.getItem(STORAGE_KEY_DAILY_DATA);

  if (lastDate === today && stored) {
    try {
      const parsed = JSON.parse(stored) as { date: string; activities: DailyActivity[]; completedIds: string[] };
      if (parsed.date === today) {
        return {
          date: parsed.date,
          activities: parsed.activities,
          completedIds: new Set(parsed.completedIds ?? []),
        };
      }
    } catch {
      // fall through to generate fresh
    }
  }

  // New day - generate fresh activities
  const activities = generateActivitiesForDate(today);
  const state: DailyState = {
    date: today,
    activities,
    completedIds: new Set(),
  };
  saveDailyState(state);
  localStorage.setItem(STORAGE_KEY_LAST_DAILY, today);
  return state;
}

export function saveDailyState(state: DailyState): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_DAILY_DATA, JSON.stringify({
    date: state.date,
    activities: state.activities,
    completedIds: Array.from(state.completedIds),
  }));
  localStorage.setItem(STORAGE_KEY_LAST_DAILY, state.date);
}

export function completeDailyActivity(state: DailyState, activityId: string): DailyState | null {
  const activity = state.activities.find((a) => a.id === activityId);
  if (!activity || state.completedIds.has(activityId)) return null;

  const newCompleted = new Set(state.completedIds);
  newCompleted.add(activityId);
  const next: DailyState = {
    ...state,
    completedIds: newCompleted,
  };
  saveDailyState(next);
  return next;
}

/** Dev cheat: advance to next real-world day for new daily activities */
export function simulateNextDay(): DailyState {
  const today = new Date();
  today.setDate(today.getDate() + 1);
  const nextDateStr = today.toISOString().slice(0, 10);
  const state: DailyState = {
    date: nextDateStr,
    activities: generateActivitiesForDate(nextDateStr),
    completedIds: new Set(),
  };
  saveDailyState(state);
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_LAST_DAILY, nextDateStr);
  }
  return state;
}
