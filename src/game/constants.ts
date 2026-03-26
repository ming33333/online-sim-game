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
export const LIVING_WITH_PARENTS_HAPPINESS_LOSS_PER_DAY = 0.5;

export const RENT_GRACE_DAYS = 3;
export const OVERTIME_MULTIPLIER = 1.5;
export const HOURS_EARLY_WORK_START = 1;
export const LATE_WORK_PERFORMANCE_PENALTY = 8;
export const PROMOTION_SALARY_MULTIPLIER_PER_TIER = 0.15;
export const MIN_PERFORMANCE_FOR_PROMOTION = 80;
export const MIN_DAYS_AT_TIER_FOR_PROMOTION = 28;

export const HUNGER_PER_HOUR = 0.5;
export const HUNGER_PER_WORK_HOUR = 1;
export const ENERGY_PER_HOUR_SLEEP = 10;

export const TUITION_PER_YEAR = 4000;
export const TUITION_PER_SEASON = TUITION_PER_YEAR / 4;
export const DEGREE_DAYS_NORMAL = 80;
export const STUDY_HOURS_PER_DAY = 8;

export const SEASON_END_DAYS = [28, 56, 84, 112] as const;

export const WORK_INTENSITY = {
  slack: { perfDelta: 1, happinessMultiplier: 0.5, energyCost: 10 },
  normal: { perfDelta: 2, happinessMultiplier: 1, energyCost: 25 },
  hard: { perfDelta: 3, happinessMultiplier: 1.5, energyCost: 40 },
} as const;

export const GYM_COSTS_PER_WEEK = { cheap: 50, normal: 100, luxury: 200 } as const;
export const GYM_HAPPINESS = { cheap: -2, normal: 0, luxury: 2 } as const;
export const WORKOUT_EFFECTS = {
  easy: { energyCost: 2, healthGain: 0.5 },
  normal: { energyCost: 5, healthGain: 1.5 },
  intense: { energyCost: 10, healthGain: 3 },
} as const;

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
  { id: 'retail', name: 'Retail Associate', description: 'Work at a local store.', salary: 2500, timeCommitmentMonths: 1, workStartHour: 10, workEndHourFull: 18, workEndHourPart: 14, allowsPartTime: true, effect: { happiness: -5, health: -2 }, promotionTiers: ['Retail Associate', 'Senior Retail Associate', 'Department Lead', 'Assistant Manager', 'Store Manager', 'District Manager', 'Regional Manager'] },
  { id: 'barista', name: 'Barista', description: 'Make coffee at a café.', salary: 2300, timeCommitmentMonths: 1, workStartHour: 5, workEndHourFull: 13, workEndHourPart: 9, allowsPartTime: true, effect: { happiness: 2, health: -3 }, promotionTiers: ['Junior Barista', 'Barista', 'Senior Barista', 'Shift Lead', 'Assistant Manager', 'Café Manager', 'District Manager'] },
  { id: 'office-assistant', name: 'Office Assistant', description: 'Administrative tasks.', salary: 3000, timeCommitmentMonths: 1, workStartHour: 8, workEndHourFull: 16, workEndHourPart: 12, allowsPartTime: true, effect: { happiness: -3, health: -5 }, promotionTiers: ['Office Assistant', 'Senior Office Assistant', 'Team Lead', 'Department Coordinator', 'Office Manager', 'Operations Manager', 'Director of Operations'] },
  { id: 'delivery-driver', name: 'Delivery Driver', description: 'Deliver packages.', salary: 2800, timeCommitmentMonths: 1, workStartHour: 7, workEndHourFull: 15, effect: { happiness: -2, health: 3 }, promotionTiers: ['Delivery Driver', 'Senior Driver', 'Route Lead', 'Dispatcher', 'Operations Supervisor', 'Fleet Manager', 'Director of Logistics'] },
  { id: 'freelancer', name: 'Freelance Work', description: 'Gig work online.', salary: 2000, timeCommitmentMonths: 1, workStartHour: 0, workEndHourFull: 24, effect: { happiness: 5, health: -8 }, promotionTiers: ['Freelancer', 'Established Freelancer', 'Senior Freelancer', 'Lead Consultant', 'Agency Partner', 'Agency Director', 'Founder'] },
  { id: 'junior-accountant', name: 'Junior Accountant', description: 'Work with ledgers at a firm.', salary: 4500, timeCommitmentMonths: 1, workStartHour: 8, workEndHourFull: 16, workEndHourPart: 12, allowsPartTime: true, effect: { happiness: -1, health: -1 }, requiredDegree: 'accounting', promotionTiers: ['Junior Accountant', 'Accountant', 'Senior Accountant', 'Lead Accountant', 'Accounting Manager', 'Controller', 'CFO'] },
  { id: 'software-engineer', name: 'Software Engineer', description: 'Build apps and systems.', salary: 6000, timeCommitmentMonths: 1, workStartHour: 10, workEndHourFull: 18, effect: { happiness: 1, health: -2 }, requiredDegree: 'engineering', promotionTiers: ['Junior Software Engineer', 'Software Engineer', 'Senior Software Engineer', 'Staff Engineer', 'Engineering Manager', 'Director of Engineering', 'VP Engineering', 'CTO'] },
  { id: 'resident-doctor', name: 'Resident Doctor', description: 'Practice medicine at hospital.', salary: 9000, timeCommitmentMonths: 1, workStartHour: 6, workEndHourFull: 14, effect: { happiness: -2, health: -4 }, requiredDegree: 'doctor', promotionTiers: ['Resident Doctor', 'Attending Physician', 'Senior Physician', 'Department Lead', 'Chief of Staff', 'Medical Director', 'VP of Medical Affairs'] },
  { id: 'financial-analyst', name: 'Financial Analyst', description: 'Analyze markets and investments.', salary: 6500, timeCommitmentMonths: 1, workStartHour: 7, workEndHourFull: 15, workEndHourPart: 11, allowsPartTime: true, effect: { happiness: 0, health: -2 }, requiredDegree: 'finance', promotionTiers: ['Junior Financial Analyst', 'Financial Analyst', 'Senior Analyst', 'Lead Analyst', 'Manager', 'Director', 'VP Finance', 'CFO'] },
];

export const CHARACTER_PRESETS: CharacterPreset[] = [
  { id: 'privileged', name: 'Privileged Start', description: 'Plenty of resources.', startingMoney: 5000, beauty: 7, smarts: 7 },
  { id: 'middle', name: 'Middle Ground', description: 'Average start.', startingMoney: 1000, beauty: 5, smarts: 5 },
  { id: 'struggling', name: 'Tough Beginnings', description: 'Very little money.', startingMoney: 0, beauty: 3, smarts: 3 },
];

export const GROCERY_OPTIONS: GroceryOption[] = [
  { id: '1week', label: '1 week', meals: 10, hungerPerMeal: 30, cost: 75 },
  { id: '2week', label: '2 weeks', meals: 22, hungerPerMeal: 30, cost: 150 },
  { id: '4week', label: '4 weeks', meals: 48, hungerPerMeal: 30, cost: 200 },
  { id: '1week-lux', label: '1 week (luxury)', meals: 10, hungerPerMeal: 50, cost: 105 },
  { id: '2week-lux', label: '2 weeks (luxury)', meals: 22, hungerPerMeal: 50, cost: 210 },
  { id: '4week-lux', label: '4 weeks (luxury)', meals: 48, hungerPerMeal: 50, cost: 280 },
];
