/**
 * Game constants - extracted from LifeSimGame for engine and simulator.
 */

import type { Apartment, Job, CharacterPreset, GroceryOption } from './types';

export const DAYS_PER_YEAR = 112;
export const DAYS_PER_SEASON = 28;
export const DAYS_PER_WEEK = 7;
export const START_YEAR = 2000;
export const BIRTH_YEAR_YOUNG_ADULT = 1996;

export const UNIVERSITY_HOUSING_STUDENT_RENT = 200;
export const UNIVERSITY_HOUSING_ID = 'university-housing';
export const LIVE_WITH_PARENTS_ID = 'live-with-parents';
/** Happiness lost each in-game calendar day while living with parents. */
export const LIVING_WITH_PARENTS_HAPPINESS_LOSS_PER_DAY = 3;
/** When you try to sell furniture at your parents' house and accept an offer, they block the sale. */
export const LIVING_WITH_PARENTS_BLOCK_FURNITURE_SELL_HAPPINESS = -10;

/** Days before week end (Sunday) to show rent reminder on phone */
export const RENT_REMINDER_DAYS_BEFORE_WEEK_END = 3;
/** Kept as alias for rent reminder UI */
export const RENT_GRACE_DAYS = RENT_REMINDER_DAYS_BEFORE_WEEK_END;

/** Calendar days since rent became overdue (Monday after missed week). Eviction at >= 7 (end of following Sunday). */
export function daysSinceOverdueDay(currentDay: number, overdueSince: number): number {
  if (currentDay >= overdueSince) return currentDay - overdueSince;
  return DAYS_PER_YEAR - overdueSince + currentDay;
}
export const OVERTIME_MULTIPLIER = 1.5;
export const HOURS_EARLY_WORK_START = 1;
/** After official shift start, this many in-game hours pass before "late" applies (0.5 = 30 min). */
export const LATE_WORK_GRACE_HOURS = 0.5;
export const LATE_WORK_PERFORMANCE_PENALTY = 4;
/** Job performance hit when leaving the workplace (leaving work mode) — player is warned before confirming. */
export const LEAVE_WORK_PERFORMANCE_PENALTY = 2.5;
export const PROMOTION_SALARY_MULTIPLIER_PER_TIER = 0.15;
export const MIN_PERFORMANCE_FOR_PROMOTION = 80;
export const MIN_DAYS_AT_TIER_FOR_PROMOTION = 28;

/** Study sessions drain this × the base hunger cost (4 = 2× harsher than the previous 2× setting). */
export const STUDY_HUNGER_DRAIN_MULTIPLIER = 4;

/** Hunger lost when passing one hour (idle time) */
export const HUNGER_PASS_ONE_HOUR = 10;
/** Hunger lost per in-game hour slept (metabolic baseline while resting) */
export const SLEEP_HUNGER_PER_HOUR = 1;

/** Time to eat a backpack snack (~12 in-game minutes) */
export const EAT_SNACK_HOURS = 0.2;
/** Time to eat a packed to-go meal (~30 in-game minutes) */
export const EAT_TOGO_MEAL_HOURS = 0.5;

/** Workplace cafeteria — paid meals on the clock; time counts toward breaks (no “late” penalty from meal before first clock-in). */
export const WORK_CAFETERIA_MEALS: {
  id: string;
  label: string;
  hunger: number;
  cost: number;
  eatHours: number;
}[] = [
  { id: 'cafe-snack', label: 'Soup & side', hunger: 6, cost: 9.5, eatHours: EAT_SNACK_HOURS },
  { id: 'cafe-regular', label: 'Daily special', hunger: 15, cost: 19, eatHours: 0.45 },
  { id: 'cafe-lux', label: 'Chef plate', hunger: 25, cost: 34, eatHours: 0.55 },
];
/** Hunger drain per hour worked (5× prior ~1.5/hr baseline) */
export const HUNGER_PER_WORK_HOUR = 7.5;
/** Multiplier on work shift energy cost (2× base intensity cost) */
export const WORK_ENERGY_MULTIPLIER = 2;
export const ENERGY_PER_HOUR_SLEEP = 10;

export const TUITION_PER_YEAR = 4000;
export const TUITION_PER_SEASON = TUITION_PER_YEAR / 4;
export const DEGREE_DAYS_NORMAL = 80;
export const STUDY_HOURS_PER_DAY = 8;

export const SEASON_END_DAYS = [28, 56, 84, 112] as const;

export const WORK_INTENSITY = {
  slack: { perfDelta: 0.25, happinessMultiplier: 0.5, energyCost: 10 },
  normal: { perfDelta: 0.5, happinessMultiplier: 1, energyCost: 25 },
  hard: { perfDelta: 0.75, happinessMultiplier: 1.5, energyCost: 40 },
} as const;

export const GYM_COSTS_PER_WEEK = { cheap: 50, normal: 100, luxury: 200 } as const;

/** Physical gym locations: one tier per district (Budget / FitZone / Elite). */
export type GymTierId = 'cheap' | 'normal' | 'luxury';
export const GYM_TIER_BY_DISTRICT: Record<'Dewmist' | 'Semba' | 'Marina', GymTierId> = {
  Dewmist: 'cheap',
  Semba: 'normal',
  Marina: 'luxury',
};
export const GYM_HAPPINESS = { cheap: 1, normal: 1, luxury: 2 } as const;
export const WORKOUT_EFFECTS = {
  easy: { energyCost: 10, healthGain: 1 },
  normal: { energyCost: 20, healthGain: 2 },
  intense: { energyCost: 40, healthGain: 4 },
} as const;

/** Fitness skill gain (0–10 scale) per 1h workout by intensity. */
export const WORKOUT_FITNESS_GAIN = {
  easy: 0.2,
  normal: 0.35,
  intense: 0.5,
} as const;

export const PARK_WALK_SOCIAL_GAIN = 0.15;

/** Happiness bonus when you witness the full moon at Dewmist Park at night (last day of season). */
export const FULL_MOON_DEWMIST_PARK_HAPPINESS = 4;
export const GYM_LOUNGE_SOCIAL_PER_HOUR = 0.08;
export const HOME_CHILL_SOCIAL_PER_HOUR = 0.05;
export const SCHOOL_LOUNGE_SOCIAL_PER_HOUR = 0.08;

/** Hours at 0 hunger and/or 0 energy before health penalties apply (per depletion streak). */
export const VITAL_DEPLETION_GRACE_HOURS = 2;

/** Job Office (Marina): browse and accept offers only during these hours. */
export const JOB_OFFICE_OPEN_HOUR = 8;
export const JOB_OFFICE_CLOSE_HOUR = 18;
export function isJobOfficeOpen(hourOfDay: number): boolean {
  const h = ((hourOfDay % 24) + 24) % 24;
  return h >= JOB_OFFICE_OPEN_HOUR && h < JOB_OFFICE_CLOSE_HOUR;
}

/** Former daily decay × 7 — applied once per in-game week (week start days). */
export const HEALTH_DECAY_WEEKLY_YOUNG_ADULT = 21;
export const HEALTH_DECAY_WEEKLY_ADULT = 35;

export const APARTMENTS: Apartment[] = [
  {
    id: 'live-with-parents',
    name: 'Live With Parents',
    description: 'Stay in your family home. No rent, but less independence.',
    rent: 0,
    position: { x: 50, y: 85 },
    district: 'Marina',
    color: 'from-gray-200 to-gray-400',
    bonus: { happiness: -2, money: 0 },
    bonusDescription: 'No rent payments, but limited freedom',
  },
  {
    id: 'downtown-loft',
    name: 'Downtown Loft',
    description: 'A trendy loft in the heart of Werdred. Close to everything but pricey.',
    rent: 1200,
    position: { x: 65, y: 25 },
    district: 'Centerlight',
    color: 'from-purple-400 to-purple-600',
    bonus: { happiness: 5, money: -1200 },
    bonusDescription: 'Great location, but expensive rent',
  },
  {
    id: 'riverside-studio',
    name: 'Riverside Studio',
    description: 'Peaceful studio overlooking the Werdred River.',
    rent: 900,
    position: { x: 25, y: 60 },
    district: 'Marina',
    color: 'from-blue-400 to-blue-600',
    bonus: { health: 5, happiness: 5, money: -900 },
    bonusDescription: 'Calming environment boosts health and happiness',
  },
  {
    id: 'suburban-apartment',
    name: 'Suburban Garden Apartment',
    description: 'Affordable and spacious. A bit far from the city center.',
    rent: 700,
    position: { x: 80, y: 70 },
    district: 'Ellum',
    color: 'from-green-400 to-green-600',
    bonus: { money: -700 },
    bonusDescription: 'Low rent helps you save money',
  },
  {
    id: 'university-housing',
    name: 'University District Housing',
    description: 'Vibrant neighborhood near Werdred University.',
    rent: 850,
    position: { x: 40, y: 30 },
    district: 'Dewmist',
    color: 'from-orange-400 to-orange-600',
    bonus: { happiness: 8, money: -850 },
    bonusDescription: 'Active social scene boosts happiness',
  },
  {
    id: 'industrial-converted',
    name: 'Converted Industrial Space',
    description: 'Unique converted warehouse space. Quirky and spacious.',
    rent: 950,
    position: { x: 15, y: 25 },
    district: 'Semba',
    color: 'from-gray-400 to-gray-600',
    bonus: { health: 3, happiness: 3, money: -950 },
    bonusDescription: 'Balanced living with unique charm',
  },
];

export const JOBS: Job[] = [
  { id: 'retail', name: 'Retail Associate', description: 'Work at a local store.', salary: 2500, timeCommitmentMonths: 1, workStartHour: 10, workEndHourFull: 18, workEndHourPart: 14, allowsPartTime: true, district: 'Centerlight', effect: { happiness: -5, health: -2 }, promotionTiers: ['Retail Associate', 'Senior Retail Associate', 'Department Lead', 'Assistant Manager', 'Store Manager', 'District Manager', 'Regional Manager'] },
  { id: 'barista', name: 'Barista', description: 'Make coffee at a café.', salary: 2300, timeCommitmentMonths: 1, workStartHour: 5, workEndHourFull: 13, workEndHourPart: 9, allowsPartTime: true, district: 'Semba', effect: { happiness: 2, health: -3 }, promotionTiers: ['Junior Barista', 'Barista', 'Senior Barista', 'Shift Lead', 'Assistant Manager', 'Café Manager', 'District Manager'] },
  { id: 'office-assistant', name: 'Office Assistant', description: 'Administrative tasks.', salary: 3000, timeCommitmentMonths: 1, workStartHour: 8, workEndHourFull: 16, workEndHourPart: 12, allowsPartTime: true, district: 'Centerlight', effect: { happiness: -3, health: -5 }, promotionTiers: ['Office Assistant', 'Senior Office Assistant', 'Team Lead', 'Department Coordinator', 'Office Manager', 'Operations Manager', 'Director of Operations'] },
  { id: 'delivery-driver', name: 'Delivery Driver', description: 'Deliver packages.', salary: 2800, timeCommitmentMonths: 1, workStartHour: 7, workEndHourFull: 15, district: 'Ellum', effect: { happiness: -2, health: 3 }, promotionTiers: ['Delivery Driver', 'Senior Driver', 'Route Lead', 'Dispatcher', 'Operations Supervisor', 'Fleet Manager', 'Director of Logistics'] },
  { id: 'freelancer', name: 'Freelance Work', description: 'Gig work online.', salary: 2000, timeCommitmentMonths: 1, workStartHour: 0, workEndHourFull: 24, district: 'Marina', effect: { happiness: 5, health: -8 }, promotionTiers: ['Freelancer', 'Established Freelancer', 'Senior Freelancer', 'Lead Consultant', 'Agency Partner', 'Agency Director', 'Founder'] },
  { id: 'junior-accountant', name: 'Junior Accountant', description: 'Work with ledgers at a firm.', salary: 4500, timeCommitmentMonths: 1, workStartHour: 8, workEndHourFull: 16, workEndHourPart: 12, allowsPartTime: true, district: 'Centerlight', effect: { happiness: -1, health: -1 }, requiredDegree: 'accounting', promotionTiers: ['Junior Accountant', 'Accountant', 'Senior Accountant', 'Lead Accountant', 'Accounting Manager', 'Controller', 'CFO'] },
  { id: 'software-engineer', name: 'Software Engineer', description: 'Build apps and systems.', salary: 6000, timeCommitmentMonths: 1, workStartHour: 10, workEndHourFull: 18, district: 'Dewmist', effect: { happiness: 1, health: -2 }, requiredDegree: 'engineering', promotionTiers: ['Junior Software Engineer', 'Software Engineer', 'Senior Software Engineer', 'Staff Engineer', 'Engineering Manager', 'Director of Engineering', 'VP Engineering', 'CTO'] },
  { id: 'resident-doctor', name: 'Resident Doctor', description: 'Practice medicine at hospital.', salary: 9000, timeCommitmentMonths: 1, workStartHour: 6, workEndHourFull: 14, district: 'Ellum', effect: { happiness: -2, health: -4 }, requiredDegree: 'doctor', promotionTiers: ['Resident Doctor', 'Attending Physician', 'Senior Physician', 'Department Lead', 'Chief of Staff', 'Medical Director', 'VP of Medical Affairs'] },
  { id: 'financial-analyst', name: 'Financial Analyst', description: 'Analyze markets and investments.', salary: 6500, timeCommitmentMonths: 1, workStartHour: 7, workEndHourFull: 15, workEndHourPart: 11, allowsPartTime: true, district: 'Marina', effect: { happiness: 0, health: -2 }, requiredDegree: 'finance', promotionTiers: ['Junior Financial Analyst', 'Financial Analyst', 'Senior Analyst', 'Lead Analyst', 'Manager', 'Director', 'VP Finance', 'CFO'] },
];

export const CHARACTER_PRESETS: CharacterPreset[] = [
  { id: 'privileged', name: 'Privileged Start', description: 'Plenty of resources.', startingMoney: 5000, beauty: 7, smarts: 7, fitness: 7, social: 7 },
  { id: 'middle', name: 'Middle Ground', description: 'Average start.', startingMoney: 1000, beauty: 5, smarts: 5, fitness: 5, social: 5 },
  { id: 'struggling', name: 'Tough Beginnings', description: 'Very little money.', startingMoney: 0, beauty: 3, smarts: 3, fitness: 3, social: 3 },
];

export const GROCERY_OPTIONS: GroceryOption[] = [
  { id: '1week', label: '1 week', meals: 10, hungerPerMeal: 30, cost: 75 },
  { id: '2week', label: '2 weeks', meals: 22, hungerPerMeal: 30, cost: 150 },
  { id: '4week', label: '4 weeks', meals: 48, hungerPerMeal: 30, cost: 200 },
  { id: '1week-lux', label: '1 week (luxury)', meals: 10, hungerPerMeal: 50, cost: 105 },
  { id: '2week-lux', label: '2 weeks (luxury)', meals: 22, hungerPerMeal: 50, cost: 210 },
  { id: '4week-lux', label: '4 weeks (luxury)', meals: 48, hungerPerMeal: 50, cost: 280 },
];
