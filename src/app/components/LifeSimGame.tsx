import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { motion } from 'motion/react';
import { Heart, Smile, Coins, Calendar, Sparkles, ScrollText, Clock, Wrench, Zap, Cloud, Briefcase, Home, GraduationCap, UtensilsCrossed, ListChecks, Gift } from 'lucide-react';
import { getWeatherForDay, getWeekForecast, isGoodWeatherForWalk, getWeatherIcon } from '../lib/weather';
import { InteractiveMap } from './InteractiveMap';
import {
  EMPTY_HOME_FURNITURE,
  type HomeFurnitureState,
  FURNITURE_BY_ID,
  hasFridge,
  getFridgeDailyEffects,
  getSleepEnergyBonusPerHour,
  getEatHungerBonus,
  getChillHappinessPerHour,
} from '../lib/furniture';
import { CharacterPortrait, CHARACTER_PORTRAIT_URLS, type PortraitPresetId } from './CharacterPortrait';
import { GymView } from './GymView';
import type { GymTier } from './GymView';
import { ParkView } from './ParkView';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { Input } from './ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  getDailyState,
  simulateNextDay,
  completeDailyActivity,
  type DailyState,
  type DailyActivity,
} from '../lib/daily-activities';
import { HOURS_EARLY_WORK_START } from '../../game/constants';

export type LifeStage =
  | 'baby'
  | 'child'
  | 'teen'
  | 'young adult'
  | 'adult'
  | 'elderly';

export interface GameStats {
  year: number;
  dayOfYear: number; // 1–112 (4 seasons × 4 weeks × 7 days)
  hourOfDay: number; // 0–23 (clock)
  birthYear: number;
  health: number;
  happiness: number;
  energy: number; // 0–100, drains with work/study, restored by sleep
  hunger: number; // 0–100, drains with actions, restored by eating
  money: number;
  beauty: number;
  smarts: number;
}

const DAYS_PER_YEAR = 112; // 4 seasons × 4 weeks × 7 days (Harvest Moon style)
const DAYS_PER_SEASON = 28;
const DAYS_PER_WEEK = 7;
const START_YEAR = 2000;
// Sims-like ages: baby 1yr, child 1yr, teen 2yr, young adult 4yr, adult 4yr, then elderly
const BIRTH_YEAR_YOUNG_ADULT = 1996; // Start at 4 (young adult) in year 2000

function getYearsAlive(year: number, dayOfYear: number, birthYear: number): number {
  return year - birthYear + (dayOfYear - 1) / DAYS_PER_YEAR;
}

const LIFE_STAGE_THRESHOLDS: { age: number; stage: LifeStage }[] = [
  { age: 1, stage: 'child' },
  { age: 2, stage: 'teen' },
  { age: 4, stage: 'young adult' },
  { age: 8, stage: 'adult' },
  { age: 12, stage: 'elderly' },
];

export function getLifeStage(year: number, dayOfYear: number, birthYear: number): LifeStage {
  const years = getYearsAlive(year, dayOfYear, birthYear);
  if (years < 1) return 'baby';
  if (years < 2) return 'child';
  if (years < 4) return 'teen';
  if (years < 8) return 'young adult';
  if (years < 12) return 'adult';
  return 'elderly';
}

/** Returns next life stage and whole years until it, or null if elderly. */
export function getYearsToNextLifeStage(
  year: number,
  dayOfYear: number,
  birthYear: number
): { nextStage: LifeStage; yearsLeft: number } | null {
  const years = getYearsAlive(year, dayOfYear, birthYear);
  const next = LIFE_STAGE_THRESHOLDS.find((t) => t.age > years);
  if (!next) return null;
  const yearsLeft = Math.ceil(next.age - years);
  return { nextStage: next.stage, yearsLeft };
}

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function formatDayOfWeek(dayOfYear: number): string {
  return DAY_NAMES[(dayOfYear - 1) % 7];
}

function formatDate(year: number, dayOfYear: number): string {
  const season = Math.floor((dayOfYear - 1) / DAYS_PER_SEASON);
  const seasonNames = ['Spring', 'Summer', 'Fall', 'Winter'];
  const weekInSeason = Math.floor(((dayOfYear - 1) % DAYS_PER_SEASON) / DAYS_PER_WEEK) + 1;
  const globalWeek = Math.floor((dayOfYear - 1) / DAYS_PER_WEEK) + 1;
  return `${formatDayOfWeek(dayOfYear)} · Day ${dayOfYear} · Week ${globalWeek} · ${seasonNames[season]} Wk${weekInSeason}`;
}

function formatTime(hour: number): string {
  const h = ((hour % 24) + 24) % 24; // normalize to 0–24
  const wholeHour = Math.floor(h);
  const minutes = Math.round((h - wholeHour) * 60) % 60;
  const hour12 = wholeHour === 0 ? 12 : wholeHour > 12 ? wholeHour - 12 : wholeHour;
  const ampm = h < 12 ? 'AM' : 'PM';
  return `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
}

/** Round to 2 decimal places for health, happiness, and other displayed decimals. */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const DAY_NAMES_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getJobScheduleLabel(
  job: { workStartHour: number; workEndHourFull: number; workEndHourPart?: number },
  schedule: 'full-time' | 'part-time'
): string {
  if (job.workStartHour === 0 && job.workEndHourFull === 24) return 'Flexible (any time)\n40 hr/week';
  const start = formatTime(job.workStartHour);
  if (schedule === 'part-time' && job.workEndHourPart != null) {
    const end = formatTime(job.workEndHourPart);
    return `Part-time · 20 hr/week\nMon–Fri ${start} – ${end}\n4 hr/day × 5 days`;
  }
  const end = formatTime(job.workEndHourFull);
  return `Full-time · 40 hr/week\nMon–Fri ${start} – ${end}\n8 hr/day × 5 days`;
}

function getPerformanceGrade(percent: number): string {
  if (percent >= 97) return 'A+';
  if (percent >= 93) return 'A';
  if (percent >= 90) return 'A-';
  if (percent >= 87) return 'B+';
  if (percent >= 83) return 'B';
  if (percent >= 80) return 'B-';
  if (percent >= 77) return 'C+';
  if (percent >= 73) return 'C';
  if (percent >= 70) return 'C-';
  if (percent >= 67) return 'D+';
  if (percent >= 63) return 'D';
  if (percent >= 60) return 'D-';
  return 'F';
}

interface CharacterPreset {
  id: string;
  name: string;
  description: string;
  startingMoney: number;
  beauty: number;
  smarts: number;
}

const CHARACTER_PRESETS: CharacterPreset[] = [
  {
    id: 'privileged',
    name: 'Privileged Start',
    description: 'You grew up with plenty of resources and advantages.',
    startingMoney: 5000,
    beauty: 7,
    smarts: 7,
  },
  {
    id: 'middle',
    name: 'Middle Ground',
    description: 'A fairly average start in life with some savings.',
    startingMoney: 1000,
    beauty: 5,
    smarts: 5,
  },
  {
    id: 'struggling',
    name: 'Tough Beginnings',
    description: 'Very little money, but still a chance to make it.',
    startingMoney: 0,
    beauty: 3,
    smarts: 3,
  },
];

export interface LogEntry {
  id: number;
  text: string;
  timestamp: string;
  effects: {
    health?: number;
    happiness?: number;
    energy?: number;
    hunger?: number;
    money?: number;
    smarts?: number;
  };
}

type GameStage = 'intro' | 'playing' | 'gameover';
type GamePhase = 'selecting-home' | 'selecting-job' | 'free-play' | 'school' | 'home' | 'gym' | 'park' | 'grocery';

// 4×4 district grid: row 0 top, row 3 bottom. Center of cell (c,r) = ((c+0.5)*25, (r+0.5)*25)
const DISTRICT_POSITIONS: Record<DistrictName, { x: number; y: number }> = {
  Dewmist: { x: 12.5, y: 12.5 },       // (0,0)
  Semba: { x: 37.5, y: 12.5 },         // (1,0)
  Centerlight: { x: 37.5, y: 62.5 },   // (1,2)
  Ellum: { x: 62.5, y: 62.5 },         // (2,2)
  Marina: { x: 37.5, y: 87.5 },        // (1,3)
};

const LOCATION_POSITIONS: Record<Exclude<GamePhase, 'home'>, { x: number; y: number }> = {
  'free-play': { x: 37.5, y: 62.5 },   // Centerlight
  'school': DISTRICT_POSITIONS.Dewmist,
  'selecting-home': DISTRICT_POSITIONS.Centerlight,
  'gym': DISTRICT_POSITIONS.Semba,
  'park': DISTRICT_POSITIONS.Ellum,
  'grocery': DISTRICT_POSITIONS.Centerlight,
  'selecting-job': DISTRICT_POSITIONS.Centerlight,
};

const LOCATION_PHASES: GamePhase[] = [
  'free-play',
  'school',
  'selecting-home',
  'home',
  'gym',
  'park',
  'grocery',
  'selecting-job',
];

// Precompute max pairwise distance (all district centers + all phase positions).
const ALL_MAP_POSITIONS = [
  ...Object.values(DISTRICT_POSITIONS),
  ...Object.values(LOCATION_POSITIONS),
];
let MAX_TRAVEL_DISTANCE = 0;
for (let i = 0; i < ALL_MAP_POSITIONS.length; i++) {
  for (let j = i + 1; j < ALL_MAP_POSITIONS.length; j++) {
    const a = ALL_MAP_POSITIONS[i];
    const b = ALL_MAP_POSITIONS[j];
    const dist = Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
    if (dist > MAX_TRAVEL_DISTANCE) MAX_TRAVEL_DISTANCE = dist;
  }
}

function getLocationPosition(
  phase: GamePhase,
  homeDistrict?: DistrictName,
  parkDistrict?: DistrictName | null,
  groceryDistrict?: DistrictName | null
): { x: number; y: number } {
  if (phase === 'home' && homeDistrict) return DISTRICT_POSITIONS[homeDistrict];
  if (phase === 'home') return DISTRICT_POSITIONS.Centerlight;
  if (phase === 'park') return DISTRICT_POSITIONS[parkDistrict ?? 'Ellum'];
  if (phase === 'grocery') return DISTRICT_POSITIONS[groceryDistrict ?? 'Centerlight'];
  return LOCATION_POSITIONS[phase];
}

function getTravelMinutes(
  from: GamePhase,
  to: GamePhase,
  homeDistrict?: DistrictName,
  fromParkDistrict?: DistrictName | null,
  fromGroceryDistrict?: DistrictName | null,
  destParkDistrict?: DistrictName,
  destGroceryDistrict?: DistrictName
): number {
  if (from === to) {
    if (from === 'park' && destParkDistrict === fromParkDistrict) return 0;
    if (from === 'grocery' && destGroceryDistrict === fromGroceryDistrict) return 0;
    if (from !== 'park' && from !== 'grocery') return 0;
  }
  const a = getLocationPosition(from, homeDistrict, fromParkDistrict, fromGroceryDistrict);
  const b = getLocationPosition(
    to,
    homeDistrict,
    destParkDistrict ?? fromParkDistrict,
    destGroceryDistrict ?? fromGroceryDistrict
  );
  const dist = Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
  if (MAX_TRAVEL_DISTANCE === 0) return 10;

  // Scale distances so closest trips are ~10 mins and the farthest is ~30 mins.
  const scaled = 10 + (dist / MAX_TRAVEL_DISTANCE) * 20; // 10–30 range
  const roundedToFive = Math.max(10, Math.min(30, Math.round(scaled / 5) * 5));
  return roundedToFive;
}
export type Degree = 'accounting' | 'engineering' | 'doctor' | 'finance';
type EducationLevel = 'none' | 'in-progress' | 'completed';

export type DistrictName = 'Dewmist' | 'Semba' | 'Centerlight' | 'Ellum' | 'Marina';

export interface Apartment {
  id: string;
  name: string;
  description: string;
  rent: number; // per season (28 days)
  position: { x: number; y: number };
  district: DistrictName;
  color: string;
  bonus: {
    health?: number;
    happiness?: number;
    money?: number;
  };
  bonusDescription: string;
}

export type JobSchedule = 'full-time' | 'part-time';

export interface Job {
  id: string;
  name: string;
  description: string;
  salary: number; // per season (tier 0), full-time; part-time = salary * 0.5
  timeCommitmentMonths: number;
  workStartHour: number;
  workEndHourFull: number;
  workEndHourPart?: number;
  allowsPartTime?: boolean;
  effect: { health?: number; happiness?: number };
  requiredDegree?: Degree;
  /** 5–8 job titles from entry-level to top. First = tier 0. Pay scales with tier. */
  promotionTiers: string[];
}

const APARTMENTS: Apartment[] = [
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
    description: 'Peaceful studio overlooking the Werdred River. Perfect for relaxation.',
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
    description: 'Affordable and spacious. A bit far from the city center but budget-friendly.',
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
    description: 'Vibrant neighborhood near Werdred University. Young and social atmosphere.',
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
    description: 'Unique converted warehouse space. Quirky and spacious with character.',
    rent: 950,
    position: { x: 15, y: 25 },
    district: 'Semba',
    color: 'from-gray-400 to-gray-600',
    bonus: { health: 3, happiness: 3, money: -950 },
    bonusDescription: 'Balanced living with unique charm',
  },
];

const UNIVERSITY_HOUSING_STUDENT_RENT = 200; // per season when enrolled and moving to university housing
const UNIVERSITY_HOUSING_ID = 'university-housing';
const LIVE_WITH_PARENTS_ID = 'live-with-parents';
const LIVING_WITH_PARENTS_HAPPINESS_LOSS_PER_DAY = 0.5;

function getHappinessMood(happiness: number): string {
  if (happiness < 20) return 'depressed';
  if (happiness < 40) return 'unhappy';
  if (happiness < 60) return 'moody';
  if (happiness < 70) return 'ok';
  if (happiness < 80) return 'content';
  if (happiness < 90) return 'happy';
  return 'elated';
}

function getHealthMood(health: number): string {
  if (health < 20) return 'unwell';
  if (health < 40) return 'bad shape';
  if (health < 50) return 'below average';
  if (health < 60) return 'fair shape';
  if (health < 70) return 'good shape';
  if (health < 80) return 'great shape';
  if (health < 90) return 'athletic';
  return 'elite finess';
}

function getEnergyMood(energy: number): string {
  if (energy < 10) return 'depleted';
  if (energy < 25) return 'exhausted';
  if (energy < 40) return 'tired';
  if (energy < 60) return 'okay';
  if (energy < 80) return 'energized';
  return 'full';
}

function getHungerMood(hunger: number): string {
  if (hunger < 10) return 'starving';
  if (hunger < 25) return 'very hungry';
  if (hunger < 40) return 'hungry';
  if (hunger < 60) return 'peckish';
  if (hunger < 80) return 'satisfied';
  return 'full';
}
const RENT_GRACE_DAYS = 3;
const OVERTIME_MULTIPLIER = 1.5;
const LATE_WORK_PERFORMANCE_PENALTY = 8; // job performance drops when late
const ON_TIME_PERFORMANCE_RECOVERY = 2; // slight recovery when on time

const PROMOTION_SALARY_MULTIPLIER_PER_TIER = 0.15; // +15% per tier
const MIN_PERFORMANCE_FOR_PROMOTION = 80; // B- or better (80%)
const MIN_DAYS_AT_TIER_FOR_PROMOTION = 28; // one season

const JOBS: Job[] = [
  {
    id: 'retail',
    name: 'Retail Associate',
    description: 'Work at a local store. Entry-level position with flexible hours.',
    salary: 2500,
    timeCommitmentMonths: 1,
    workStartHour: 10,
    workEndHourFull: 18,
    workEndHourPart: 14,
    allowsPartTime: true,
    effect: { happiness: -5, health: -2 },
    promotionTiers: ['Retail Associate', 'Senior Retail Associate', 'Department Lead', 'Assistant Manager', 'Store Manager', 'District Manager', 'Regional Manager'],
  },
  {
    id: 'barista',
    name: 'Barista',
    description: 'Make coffee at a trendy café. Meet interesting people daily.',
    salary: 2300,
    timeCommitmentMonths: 1,
    workStartHour: 5,
    workEndHourFull: 13,
    workEndHourPart: 9,
    allowsPartTime: true,
    effect: { happiness: 2, health: -3 },
    promotionTiers: ['Junior Barista', 'Barista', 'Senior Barista', 'Shift Lead', 'Assistant Manager', 'Café Manager', 'District Manager'],
  },
  {
    id: 'office-assistant',
    name: 'Office Assistant',
    description: 'Help with administrative tasks. Professional environment.',
    salary: 3000,
    timeCommitmentMonths: 1,
    workStartHour: 8,
    workEndHourFull: 16,
    workEndHourPart: 12,
    allowsPartTime: true,
    effect: { happiness: -3, health: -5 },
    promotionTiers: ['Office Assistant', 'Senior Office Assistant', 'Team Lead', 'Department Coordinator', 'Office Manager', 'Operations Manager', 'Director of Operations'],
  },
  {
    id: 'delivery-driver',
    name: 'Delivery Driver',
    description: 'Deliver packages around Werdred. Stay active on the job.',
    salary: 2800,
    timeCommitmentMonths: 1,
    workStartHour: 7,
    workEndHourFull: 15,
    effect: { happiness: -2, health: 3 },
    promotionTiers: ['Delivery Driver', 'Senior Driver', 'Route Lead', 'Dispatcher', 'Operations Supervisor', 'Fleet Manager', 'Director of Logistics'],
  },
  {
    id: 'freelancer',
    name: 'Freelance Work',
    description: 'Do gig work online. Work from home with variable income.',
    salary: 2000,
    timeCommitmentMonths: 1,
    workStartHour: 0,
    workEndHourFull: 24,
    effect: { happiness: 5, health: -8 },
    promotionTiers: ['Freelancer', 'Established Freelancer', 'Senior Freelancer', 'Lead Consultant', 'Agency Partner', 'Agency Director', 'Founder'],
  },
  {
    id: 'junior-accountant',
    name: 'Junior Accountant',
    description: 'Work with ledgers, reports, and clients at a local firm.',
    salary: 4500,
    timeCommitmentMonths: 1,
    workStartHour: 8,
    workEndHourFull: 16,
    workEndHourPart: 12,
    allowsPartTime: true,
    effect: { happiness: -1, health: -1 },
    requiredDegree: 'accounting',
    promotionTiers: ['Junior Accountant', 'Accountant', 'Senior Accountant', 'Lead Accountant', 'Accounting Manager', 'Controller', 'CFO'],
  },
  {
    id: 'software-engineer',
    name: 'Software Engineer',
    description: 'Build apps and systems in a fast-paced tech company.',
    salary: 6000,
    timeCommitmentMonths: 1,
    workStartHour: 10,
    workEndHourFull: 18,
    effect: { happiness: 1, health: -2 },
    requiredDegree: 'engineering',
    promotionTiers: ['Junior Software Engineer', 'Software Engineer', 'Senior Software Engineer', 'Staff Engineer', 'Engineering Manager', 'Director of Engineering', 'VP Engineering', 'CTO'],
  },
  {
    id: 'resident-doctor',
    name: 'Resident Doctor',
    description: 'Practice medicine at Werdred General Hospital after med school.',
    salary: 9000,
    timeCommitmentMonths: 1,
    workStartHour: 6,
    workEndHourFull: 14,
    effect: { happiness: -2, health: -4 },
    requiredDegree: 'doctor',
    promotionTiers: ['Resident Doctor', 'Attending Physician', 'Senior Physician', 'Department Lead', 'Chief of Staff', 'Medical Director', 'VP of Medical Affairs'],
  },
  {
    id: 'financial-analyst',
    name: 'Financial Analyst',
    description: 'Analyze markets and investments at a finance firm.',
    salary: 6500,
    timeCommitmentMonths: 1,
    workStartHour: 7,
    workEndHourFull: 15,
    workEndHourPart: 11,
    allowsPartTime: true,
    effect: { happiness: 0, health: -2 },
    requiredDegree: 'finance',
    promotionTiers: ['Junior Financial Analyst', 'Financial Analyst', 'Senior Analyst', 'Lead Analyst', 'Manager', 'Director', 'VP Finance', 'CFO'],
  },
];

export function LifeSimGame() {
  const [stage, setStage] = useState<GameStage>('intro');
  const [stats, setStats] = useState<GameStats>({
    year: START_YEAR,
    dayOfYear: 1,
    hourOfDay: 9,
    birthYear: BIRTH_YEAR_YOUNG_ADULT,
    health: 80,
    happiness: 70,
    energy: 100,
    hunger: 100,
    money: 10000,
    beauty: 5,
    smarts: 5,
  });
  const [characterName, setCharacterName] = useState('');
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterPreset | null>(null);
  const [selectedApartment, setSelectedApartment] = useState<Apartment | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [jobSchedule, setJobSchedule] = useState<JobSchedule>('full-time');
  const [jobTierIndex, setJobTierIndex] = useState(0); // 0 = entry tier; used with job.promotionTiers
  const [jobTierStartedYear, setJobTierStartedYear] = useState(START_YEAR);
  const [jobTierStartedDayOfYear, setJobTierStartedDayOfYear] = useState(1);
  const [jobStartedYear, setJobStartedYear] = useState<number | null>(null); // first day in current job
  const [jobStartedDayOfYear, setJobStartedDayOfYear] = useState<number | null>(null);
  const [jobPerformance, setJobPerformance] = useState(70); // 0–100, C = 70%; start at C, on-time/overtime raises, late drops
  const [rentOverdue, setRentOverdue] = useState(false);
  const [rentOverdueSinceDay, setRentOverdueSinceDay] = useState(0);
  const [lastRentPaidSeasonEndDay, setLastRentPaidSeasonEndDay] = useState<number | null>(null); // 28, 56, 84, or 112
  const [activityCount, setActivityCount] = useState(0);
  const [eventLog, setEventLog] = useState<LogEntry[]>([]);
  const [gamePhase, setGamePhase] = useState<GamePhase>('selecting-home');
  const [educationLevel, setEducationLevel] = useState<EducationLevel>('none');
  const [educationDegree, setEducationDegree] = useState<Degree | null>(null);
  const [educationProgress, setEducationProgress] = useState(0);
  const [gymMembership, setGymMembership] = useState<GymTier | null>(null);
  const [gymMembershipStartDay, setGymMembershipStartDay] = useState<number | null>(null);
  const [groceries, setGroceries] = useState<{ regular: number; lux: number }>({ regular: 0, lux: 0 }); // meal counts
  const [homeFurniture, setHomeFurniture] = useState<HomeFurnitureState>(EMPTY_HOME_FURNITURE);
  const [funItems, setFunItems] = useState<string[]>([]); // item ids from daily rewards
  const [diplomas, setDiplomas] = useState<Degree[]>([]);
  const [dailyState, setDailyState] = useState<DailyState>(() => getDailyState());
  const [dailyActivitiesOpen, setDailyActivitiesOpen] = useState(false);
  const [devCheatsOpen, setDevCheatsOpen] = useState(false);
  const [calendarOverlayOpen, setCalendarOverlayOpen] = useState(false);
  const [mapOverlayOpen, setMapOverlayOpen] = useState(false);
  const [pendingGoHomeAnimation, setPendingGoHomeAnimation] = useState(false);
  const [pendingGoToSchoolAnimation, setPendingGoToSchoolAnimation] = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [showAlreadyPaidRentDialog, setShowAlreadyPaidRentDialog] = useState(false);
  const [pendingMoveApartment, setPendingMoveApartment] = useState<Apartment | null>(null);
  const [parkDistrict, setParkDistrict] = useState<DistrictName | null>('Ellum');
  const [groceryDistrict, setGroceryDistrict] = useState<DistrictName | null>('Centerlight');
  const [devForm, setDevForm] = useState({
    health: '', happiness: '', energy: '', hunger: '', money: '', beauty: '', smarts: '',
    year: '', dayOfYear: '', hourOfDay: '',
    jobPerformance: '', jobTierIndex: '',
  });

  const loadDevFormFromStats = () => {
    setDevForm({
      health: stats.health.toFixed(2),
      happiness: stats.happiness.toFixed(2),
      energy: stats.energy.toFixed(2),
      hunger: stats.hunger.toFixed(2),
      money: String(stats.money),
      beauty: stats.beauty.toFixed(2),
      smarts: stats.smarts.toFixed(2),
      year: String(stats.year),
      dayOfYear: String(stats.dayOfYear),
      hourOfDay: String(stats.hourOfDay),
      jobPerformance: String(jobPerformance),
      jobTierIndex: String(selectedJob ? Math.min(jobTierIndex, selectedJob.promotionTiers.length - 1) : 0),
    });
  };

  const applyDevCheats = () => {
    const num = (s: string, min: number, max: number) =>
      Math.max(min, Math.min(max, parseFloat(s) || min));
    const clampDay = (n: number) => Math.max(1, Math.min(DAYS_PER_YEAR, Math.floor(n) || 1));
    const clampHour = (n: number) => Math.max(0, Math.min(23, Math.floor(n) || 0));
    setStats((prev) => ({
      ...prev,
      health: round2(num(devForm.health, 0, 100)),
      happiness: round2(num(devForm.happiness, 0, 100)),
      energy: round2(num(devForm.energy, 0, 100)),
      hunger: round2(num(devForm.hunger, 0, 100)),
      money: Math.max(0, parseFloat(devForm.money) || 0),
      beauty: round2(num(devForm.beauty, 0, 10)),
      smarts: round2(num(devForm.smarts, 0, 10)),
      year: Math.max(START_YEAR, Math.floor(parseFloat(devForm.year) || START_YEAR)),
      dayOfYear: clampDay(parseFloat(devForm.dayOfYear) || 1),
      hourOfDay: clampHour(parseFloat(devForm.hourOfDay) || 0),
    }));
    setJobPerformance(Math.max(0, Math.min(100, Math.floor(parseFloat(devForm.jobPerformance) || 70))));
    if (selectedJob) {
      const maxTier = selectedJob.promotionTiers.length - 1;
      setJobTierIndex(Math.max(0, Math.min(maxTier, Math.floor(parseFloat(devForm.jobTierIndex) || 0))));
    }
  };

  const startGame = () => {
    if (!selectedCharacter) return;

    const randomStatLowBias = (min: number, max: number) => {
      const range = max - min;
      const skew = Math.pow(Math.random(), 1.5);
      return Math.round((min + range * skew) * 100) / 100;
    };
    setStage('playing');
    setStats({
      year: START_YEAR,
      dayOfYear: 1,
      hourOfDay: 9,
      birthYear: BIRTH_YEAR_YOUNG_ADULT,
      health: randomStatLowBias(40, 70),
      happiness: randomStatLowBias(40, 70),
      energy: 100,
      hunger: 100,
      money: selectedCharacter.startingMoney,
      beauty: selectedCharacter.beauty,
      smarts: selectedCharacter.smarts,
    });
    setActivityCount(0);
    setEventLog([]);
    setSelectedApartment(null);
    setSelectedJob(null);
    setGymMembership(null);
    setGymMembershipStartDay(null);
    setGroceries({ regular: 0, lux: 0 });
    setHomeFurniture(EMPTY_HOME_FURNITURE);
    setFunItems([]);
    setLastRentPaidSeasonEndDay(null);
    setJobSchedule('full-time');
    setJobTierIndex(0);
    setJobTierStartedYear(START_YEAR);
    setJobTierStartedDayOfYear(1);
    setJobStartedYear(null);
    setJobStartedDayOfYear(null);
    setJobPerformance(70);
    setRentOverdue(false);
    setRentOverdueSinceDay(0);
    setGamePhase('selecting-home');
  };

  useEffect(() => {
    if (stage === 'playing') {
      const next = getDailyState();
      setDailyState(next);
      const hasIncomplete = next.activities.some((a) => !next.completedIds.has(a.id));
      if (hasIncomplete) setDailyActivitiesOpen(true);
    }
  }, [stage]);

  const claimDailyActivity = (activity: DailyActivity) => {
    const next = completeDailyActivity(dailyState, activity.id);
    if (!next) return;

    setDailyState(next);

    if (activity.rewardType === 'money') {
      const amount = activity.rewardValue as number;
      setStats((prev) => ({ ...prev, money: prev.money + amount }));
    } else if (activity.rewardType === 'food') {
      const v = activity.rewardValue as number;
      const meals = Math.abs(v);
      const isLux = v < 0;
      setGroceries((prev) =>
        isLux ? { ...prev, lux: prev.lux + meals } : { ...prev, regular: prev.regular + meals }
      );
    } else {
      setFunItems((prev) => [...prev, activity.rewardValue as string]);
    }

    const rewardText =
      activity.rewardType === 'money'
        ? `+$${activity.rewardValue}`
        : activity.rewardType === 'food'
          ? `+${activity.rewardLabel}`
          : `+${activity.rewardLabel} (inventory)`;
    const entry: LogEntry = {
      id: Date.now(),
      text: `Completed daily: ${activity.name}. Reward: ${rewardText}`,
      timestamp: formatTimestamp(stats.year, stats.dayOfYear, stats.hourOfDay),
      effects: activity.rewardType === 'money' ? { money: activity.rewardValue as number } : {},
    };
    setEventLog((prev) => [entry, ...prev]);
  };

  const handleSimulateNextDay = () => {
    setDailyState(simulateNextDay());
  };

  const FUN_ITEM_NAMES: Record<string, string> = {
    rubiks: "Rubik's Cube",
    sketchbook: 'Sketchbook',
    novel: 'Mystery Novel',
    'board-game': 'Board Game',
    plant: 'Succulent',
    'coffee-mug': 'Fancy Coffee Mug',
    poster: 'Cool Poster',
    candle: 'Scented Candle',
    'yoga-mat': 'Yoga Mat',
    headphones: 'Nice Headphones',
  };

  const liveWithParentsApartment = APARTMENTS.find((a) => a.id === LIVE_WITH_PARENTS_ID)!;

  const selectApartment = (apartment: Apartment) => {
    const isEnrolled = educationLevel === 'in-progress';
    const isMovingToUniversityHousing = apartment.id === UNIVERSITY_HOUSING_ID;
    const fullSeasonRent =
      isMovingToUniversityHousing && isEnrolled
        ? UNIVERSITY_HOUSING_STUDENT_RENT
        : apartment.rent;

    // Prorate rent by days left in current season
    const SEASON_END_DAYS = [28, 56, 84, 112];
    const seasonEnd = SEASON_END_DAYS.find((d) => d >= stats.dayOfYear) ?? 112;
    const daysLeftInSeason = seasonEnd - stats.dayOfYear + 1;
    const rentToCharge = fullSeasonRent > 0
      ? Math.round((daysLeftInSeason / DAYS_PER_SEASON) * fullSeasonRent)
      : 0;

    if (rentToCharge > 0 && stats.money < rentToCharge) return;
    const moneyAfterRent = rentToCharge > 0 ? Math.max(0, stats.money - rentToCharge) : stats.money;
    const newStats: GameStats = {
      ...stats,
      health: round2(Math.max(0, Math.min(100, stats.health + (apartment.bonus.health || 0)))),
      happiness: round2(Math.max(0, Math.min(100, stats.happiness + (apartment.bonus.happiness || 0)))),
      money: moneyAfterRent,
    };

    setStats(newStats);
    setSelectedApartment(apartment);
    if (rentToCharge > 0) {
      const firstSeasonEnd = [28, 56, 84, 112].find((d) => d >= stats.dayOfYear) ?? 28;
      setLastRentPaidSeasonEndDay(
        stats.dayOfYear <= 28 ? Math.max(0, firstSeasonEnd - DAYS_PER_SEASON) : firstSeasonEnd
      );
    } else {
      setLastRentPaidSeasonEndDay(null);
    }

    const isProrated = daysLeftInSeason < DAYS_PER_SEASON;
    const rentNote =
      rentToCharge > 0
        ? isMovingToUniversityHousing && isEnrolled
          ? ` Student rate: ${isProrated ? `prorated rent ($${rentToCharge}) for ${daysLeftInSeason} days left` : 'first season\'s rent ($${rentToCharge})'} paid. Future rent due at end of each season (3-day grace).`
          : ` ${isProrated ? `Prorated rent ($${rentToCharge}) for ${daysLeftInSeason} days left` : `First season's rent ($${rentToCharge})`} paid. Future rent due at end of each season (3-day grace).`
        : ' No rent.';
    const welcomeEntry: LogEntry = {
      id: Date.now(),
      text: `You moved into ${apartment.name} in Werdred! ${apartment.bonusDescription}.${rentNote}`,
      timestamp: formatTimestamp(newStats.year, newStats.dayOfYear, newStats.hourOfDay ?? 9),
      effects: {
        ...(apartment.bonus.health != null && { health: round2(apartment.bonus.health) }),
        ...(apartment.bonus.happiness != null && { happiness: round2(apartment.bonus.happiness) }),
      },
    };
    setEventLog((prev) => [welcomeEntry, ...prev]);

    setGamePhase('free-play');
  };

  const selectJob = (job: Job, schedule?: JobSchedule) => {
    setSelectedJob(job);
    setJobTierIndex(0);
    setJobTierStartedYear(stats.year);
    setJobTierStartedDayOfYear(stats.dayOfYear);
    setJobStartedYear(stats.year);
    setJobStartedDayOfYear(stats.dayOfYear);
    setJobPerformance(70);
    if (schedule) setJobSchedule(schedule);

    const lifeStage = getLifeStage(stats.year, stats.dayOfYear, stats.birthYear);
    const sched = schedule ?? jobSchedule;
    const hours = sched === 'part-time' && job.allowsPartTime ? '20 hr/week (part-time)' : '40 hr/week (full-time)';
    const title = job.promotionTiers[0];
    const jobEntry: LogEntry = {
      id: Date.now() + 1,
      text: `You accepted a job as ${title} (${hours}). Work during scheduled hours for full pay.`,
      timestamp: `${formatDate(stats.year, stats.dayOfYear)} ${formatTime(stats.hourOfDay)} · ${lifeStage}`,
      effects: {},
    };
    setEventLog((prev) => [jobEntry, ...prev]);

    setGamePhase('free-play');
  };

  const getTierSalaryMultiplier = (tierIndex: number) =>
    1 + tierIndex * PROMOTION_SALARY_MULTIPLIER_PER_TIER;
  const getEffectiveSalary = (job: Job, tierOverride?: number) => {
    const base = jobSchedule === 'part-time' && job.allowsPartTime ? job.salary * 0.5 : job.salary;
    const tier = tierOverride ?? (selectedJob?.id === job.id ? jobTierIndex : 0);
    return base * getTierSalaryMultiplier(tier);
  };
  const salaryPerDay = (job: Job, tierOverride?: number) => {
    const sal = getEffectiveSalary(job, tierOverride);
    return Math.round((sal / DAYS_PER_SEASON) * 100) / 100;
  };
  const salaryPerHour = (job: Job, tierOverride?: number) => {
    const hoursPerDay = jobSchedule === 'part-time' && job.allowsPartTime ? 4 : 8;
    return Math.round((salaryPerDay(job, tierOverride) / hoursPerDay) * 100) / 100;
  };
  const getCurrentJobTitle = (job: Job) => job.promotionTiers[Math.min(jobTierIndex, job.promotionTiers.length - 1)];
  const daysAtCurrentTier = (): number => {
    const totalDays = (stats.year - jobTierStartedYear) * DAYS_PER_YEAR + (stats.dayOfYear - jobTierStartedDayOfYear);
    return Math.max(0, totalDays);
  };
  const hasWaitedFirstDayForJob = (): boolean => {
    if (jobStartedYear == null || jobStartedDayOfYear == null) return true;
    const totalDays = (stats.year - jobStartedYear) * DAYS_PER_YEAR + (stats.dayOfYear - jobStartedDayOfYear);
    return totalDays >= 1;
  };
  const canAskForPromotion = (): { allowed: boolean; reason?: string } => {
    if (!selectedJob) return { allowed: false, reason: 'No job.' };
    const tiers = selectedJob.promotionTiers;
    if (jobTierIndex >= tiers.length - 1) return { allowed: false, reason: "You're already at the top of this career." };
    if (jobPerformance < MIN_PERFORMANCE_FOR_PROMOTION)
      return { allowed: false, reason: `Job performance too low. Need ${MIN_PERFORMANCE_FOR_PROMOTION}% (B-) or higher. Yours: ${jobPerformance.toFixed(0)}%.` };
    const days = daysAtCurrentTier();
    if (days < MIN_DAYS_AT_TIER_FOR_PROMOTION)
      return { allowed: false, reason: `Not enough time in this role. Work at least ${MIN_DAYS_AT_TIER_FOR_PROMOTION} days (1 season). You've worked ${days} days.` };
    return { allowed: true };
  };
  const getPromotionChance = (): number => {
    if (!selectedJob) return 0;
    const check = canAskForPromotion();
    if (!check.allowed) return 0;
    const days = daysAtCurrentTier();
    const perfNorm = Math.max(
      0,
      Math.min(1, (jobPerformance - MIN_PERFORMANCE_FOR_PROMOTION) / (100 - MIN_PERFORMANCE_FOR_PROMOTION))
    );
    const daysNorm = Math.max(
      0,
      Math.min(1, (days - MIN_DAYS_AT_TIER_FOR_PROMOTION) / MIN_DAYS_AT_TIER_FOR_PROMOTION)
    );
    const raw = 0.2 + 0.4 * perfNorm + 0.4 * daysNorm; // 20%–100% before clamp
    return Math.max(0.2, Math.min(0.9, raw)); // clamp to 20%–90%
  };
  const askForPromotion = () => {
    const check = canAskForPromotion();
    if (!check.allowed) return;
    if (!selectedJob) return;
    const chance = getPromotionChance();
    const roll = Math.random();
    if (roll >= chance) {
      const failEntry: LogEntry = {
        id: Date.now(),
        text: `You asked for a promotion, but it didn't work out this time. (Chance was ${(chance * 100).toFixed(0)}%)`,
        timestamp: formatTimestamp(stats.year, stats.dayOfYear, stats.hourOfDay),
        effects: {},
      };
      setEventLog((prev) => [failEntry, ...prev]);
      return;
    }
    const nextTier = jobTierIndex + 1;
    setJobTierIndex(nextTier);
    setJobTierStartedYear(stats.year);
    setJobTierStartedDayOfYear(stats.dayOfYear);
    const newTitle = selectedJob.promotionTiers[nextTier];
    const lifeStage = getLifeStage(stats.year, stats.dayOfYear, stats.birthYear);
    const promoEntry: LogEntry = {
      id: Date.now(),
      text: `You were promoted to ${newTitle}! Pay increased.`,
      timestamp: formatTimestamp(stats.year, stats.dayOfYear, stats.hourOfDay),
      effects: {},
    };
    setEventLog((prev) => [promoEntry, ...prev]);
  };
  const workHoursPerShift = () =>
    jobSchedule === 'part-time' ? 4 : 8;

  const getWorkEndHour = (job: Job) =>
    jobSchedule === 'part-time' && job.workEndHourPart != null
      ? job.workEndHourPart
      : job.workEndHourFull;

  const isWithinSchedule = (job: Job, hour: number, hoursToWork: number): boolean => {
    if (job.workStartHour === 0 && job.workEndHourFull === 24) return true; // freelancer
    const endHour = getWorkEndHour(job);
    return hour >= job.workStartHour && hour + hoursToWork <= endHour;
  };

  const isWeekday = (): boolean => ((stats.dayOfYear - 1) % 7) < 5; // Mon=0..Fri=4, Sat=5, Sun=6

  const isDuringWorkHours = (job: Job, hour: number): boolean => {
    if (job.workStartHour === 0 && job.workEndHourFull === 24) return true; // freelancer
    if (!isWeekday()) return false; // Mon–Fri only
    const endHour = getWorkEndHour(job);
    return hour >= job.workStartHour && hour - HOURS_EARLY_WORK_START < endHour; //
  };

  const getHoursAvailableToWork = (job: Job, hour: number): number => {
    if (job.workStartHour === 0 && job.workEndHourFull === 24) return workHoursPerShift();
    const endHour = getWorkEndHour(job);
    return Math.min(workHoursPerShift(), Math.max(0, endHour - hour));
  };

  const isLateForWork = (job: Job, hour: number): boolean => {
    if (job.workStartHour === 0 && job.workEndHourFull === 24) return false; // freelancer
    return hour > job.workStartHour;
  };

  const canWorkNow = (): boolean => {
    if (!selectedJob) return false;
    if (!hasWaitedFirstDayForJob()) return false;
    return isDuringWorkHours(selectedJob, stats.hourOfDay) && getHoursAvailableToWork(selectedJob, stats.hourOfDay) > 0;
  };

  const canWorkOvertimeNow = (): boolean => {
    if (!selectedJob || selectedJob.workStartHour === 0) return false;
    if (!hasWaitedFirstDayForJob()) return false;
    if (!isWeekday()) return false; // Mon–Fri only
    const endHour = getWorkEndHour(selectedJob);
    return stats.hourOfDay >= endHour && stats.hourOfDay < endHour + 2;
  };

  const HUNGER_PER_HOUR = 0.5;
  const HUNGER_PER_WORK_HOUR = 1;
  const passOneHour = () => {
    advanceTime({ hunger: -HUNGER_PER_HOUR }, '1 hour passed.', 1);
  };

  type WorkIntensity = 'slack' | 'normal' | 'hard';
  const WORK_INTENSITY = {
    slack: { perfDelta: 1, happinessMultiplier: 0.5, energyCost: 10 },
    normal: { perfDelta: 2, happinessMultiplier: 1, energyCost: 25 },
    hard: { perfDelta: 3, happinessMultiplier: 1.5, energyCost: 40 },
  } satisfies Record<WorkIntensity, { perfDelta: number; happinessMultiplier: number; energyCost: number }>;

  const workShift = (overtimeHours: number = 0, intensity: WorkIntensity = 'normal') => {
    if (!selectedJob) return;

    const inOvertimeWindow = overtimeHours > 0 && canWorkOvertimeNow();
    const inRegularHours = isDuringWorkHours(selectedJob, stats.hourOfDay);

    if (!inOvertimeWindow && !inRegularHours) return;

    const baseHours = inOvertimeWindow ? 0 : getHoursAvailableToWork(selectedJob, stats.hourOfDay);
    const totalHours = baseHours + overtimeHours;
    const isOT = overtimeHours > 0;
    const hrRate = salaryPerHour(selectedJob);
    const basePay = hrRate * baseHours;
    const otPay = isOT ? hrRate * overtimeHours * OVERTIME_MULTIPLIER : 0;
    const actualPay = Math.round((basePay + otPay) * 100) / 100;

    const late = !inOvertimeWindow && isLateForWork(selectedJob, stats.hourOfDay);
    const { perfDelta, happinessMultiplier } = WORK_INTENSITY[intensity];
    const newPerformance = Math.max(0, Math.min(100,
      jobPerformance + (late ? -LATE_WORK_PERFORMANCE_PENALTY : perfDelta)
    ));
    setJobPerformance(newPerformance);

    const healthDelta = (selectedJob.effect.health ?? 0) * totalHours / (8 * DAYS_PER_SEASON);
    const baseHappinessDelta = (selectedJob.effect.happiness ?? 0) * totalHours / (8 * DAYS_PER_SEASON);
    const happinessDelta = baseHappinessDelta * happinessMultiplier;
    const energyCost = WORK_INTENSITY[intensity].energyCost;

    const jobTitle = getCurrentJobTitle(selectedJob);
    const intensityLabel = intensity === 'slack' ? 'Slack' : intensity === 'hard' ? 'Hard' : 'Normal';
    let msg = `You worked ${totalHours} hour${totalHours > 1 ? 's' : ''} as ${jobTitle} (${intensityLabel}). `;
    if (isOT) msg += '(Overtime) ';
    if (!inOvertimeWindow && isLateForWork(selectedJob, stats.hourOfDay)) msg += '(Late — job performance dropped.) ';
    msg += `Earned $${actualPay.toFixed(2)}.`;

    const hungerCost = -HUNGER_PER_WORK_HOUR * totalHours;
    advanceTime(
      { health: healthDelta, happiness: happinessDelta, energy: -energyCost, hunger: hungerCost, money: actualPay },
      msg,
      totalHours
    );
  };

  const formatTimestamp = (year: number, dayOfYear: number, hourOfDay?: number) => {
    const lifeStage = getLifeStage(year, dayOfYear, stats.birthYear);
    const time = hourOfDay !== undefined ? ` ${formatTime(hourOfDay)}` : '';
    return `${formatDate(year, dayOfYear)}${time} · ${lifeStage}`;
  };

  const advanceTime = (
    effect: { health?: number; happiness?: number; energy?: number; hunger?: number; money?: number; smarts?: number },
    resultText: string,
    hoursPassed: number,
    overrideRentPerSeason?: number
  ) => {
    // Block actions that would consume energy when the player is already exhausted.
    if ((effect.energy ?? 0) < 0 && stats.energy <= 0) {
      const exhaustedEntry: LogEntry = {
        id: Date.now(),
        text: 'You are too exhausted to do that. Get some sleep to recover energy.',
        timestamp: formatTimestamp(stats.year, stats.dayOfYear, stats.hourOfDay),
        effects: {},
      };
      setEventLog((prev) => [exhaustedEntry, ...prev]);
      return;
    }

    let moneyDelta = effect.money || 0;
    let happinessDeltaFromParents = 0;
    let newDayOfYear = stats.dayOfYear;
    let newYear = stats.year;
    let newHourOfDay = stats.hourOfDay + hoursPassed;
    let newRentOverdue = rentOverdue;
    let newRentOverdueSinceDay = rentOverdueSinceDay;
    let newSelectedApartment = selectedApartment;
    let newLastRentPaidSeasonEndDay = lastRentPaidSeasonEndDay;

    let groceryR = groceries.regular;
    let groceryL = groceries.lux;
    let furnitureHappinessDelta = 0;
    let furnitureHungerDelta = 0;
    let spoilRegular = 0;
    let spoilLux = 0;

    let healthDeltaFromDaily = 0;
    while (newHourOfDay >= 24) {
      if (newSelectedApartment?.id === LIVE_WITH_PARENTS_ID) {
        happinessDeltaFromParents -= LIVING_WITH_PARENTS_HAPPINESS_LOSS_PER_DAY;
      }
      newHourOfDay -= 24;
      newDayOfYear += 1;

      if (newDayOfYear > DAYS_PER_YEAR) {
        newDayOfYear -= DAYS_PER_YEAR;
        newYear += 1;
      }

      const lifeStageForDay = getLifeStage(newYear, newDayOfYear, stats.birthYear);
      const healthDecayPerDay =
        lifeStageForDay === 'elderly' ? 8 :
        lifeStageForDay === 'adult' ? 5 :
        lifeStageForDay === 'young adult' ? 3 : 0;
      healthDeltaFromDaily -= healthDecayPerDay;

      const seasonEndDays = [28, 56, 84, 112];
      const justCrossedSeasonEnd = seasonEndDays.includes(newDayOfYear - 1) || newDayOfYear === 1;
      const seasonJustEnded = newDayOfYear === 1 ? 112 : newDayOfYear - 1;
      const baseRent = overrideRentPerSeason ?? (newSelectedApartment ? newSelectedApartment.rent : 0);
      const rentPerSeason =
        newSelectedApartment?.id === UNIVERSITY_HOUSING_ID && educationLevel === 'in-progress'
          ? UNIVERSITY_HOUSING_STUDENT_RENT
          : baseRent;
      const alreadyPaidForThisSeason = newLastRentPaidSeasonEndDay != null && newLastRentPaidSeasonEndDay >= seasonJustEnded;

      if (justCrossedSeasonEnd && rentPerSeason > 0 && !newRentOverdue && !alreadyPaidForThisSeason) {
        if (stats.money + moneyDelta >= rentPerSeason) {
          moneyDelta -= rentPerSeason;
          newLastRentPaidSeasonEndDay = seasonJustEnded;
          setEventLog((prev) => [
            {
              id: Date.now() + 400,
              text: `Rent paid: $${rentPerSeason.toLocaleString()} for the season.`,
              timestamp: formatTimestamp(newYear, newDayOfYear, newHourOfDay),
              effects: { money: -rentPerSeason },
            },
            ...prev,
          ]);
        } else {
          newRentOverdue = true;
          newRentOverdueSinceDay = newDayOfYear;
        }
      }

      // Tuition reminder: 3 days before season end if enrolled in a degree.
      if (
        educationLevel === 'in-progress' &&
        seasonEndDays.some((end) => newDayOfYear === end - 3)
      ) {
        setEventLog((prev) => [
          {
            id: Date.now() + 300,
            text: '📱 Tuition reminder: In 3 days you will owe tuition for the next season of your degree. Open your phone to pay now.',
            timestamp: formatTimestamp(newYear, newDayOfYear, newHourOfDay),
            effects: {},
          },
          ...prev,
        ]);
      }

      // Rent reminder: 3 days before season end when rent > 0 and not living with parents.
      const rentPerSeasonForReminder = newSelectedApartment?.id === UNIVERSITY_HOUSING_ID && educationLevel === 'in-progress'
        ? UNIVERSITY_HOUSING_STUDENT_RENT
        : (newSelectedApartment?.rent ?? 0);
      if (
        rentPerSeasonForReminder > 0 &&
        seasonEndDays.some((end) => newDayOfYear === end - 3)
      ) {
        setEventLog((prev) => [
          {
            id: Date.now() + 301,
            text: `📱 Rent reminder: In 3 days you will owe $${rentPerSeasonForReminder.toLocaleString()} rent for the next season. Open your phone to pay now.`,
            timestamp: formatTimestamp(newYear, newDayOfYear, newHourOfDay),
            effects: {},
          },
          ...prev,
        ]);
      }

      // Gym membership: charge weekly at start of each week (first week free if joined mid-week)
      const justCrossedWeekStart = (newDayOfYear - 1) % 7 === 0;
      const currentWeekNum = Math.floor((newDayOfYear - 1) / 7);
      const joinWeekNum = gymMembershipStartDay != null ? Math.floor((gymMembershipStartDay - 1) / 7) : -1;
      if (justCrossedWeekStart && gymMembership && currentWeekNum > joinWeekNum) {
        const GYM_WEEKLY: Record<typeof gymMembership, number> = { cheap: 50, normal: 100, luxury: 200 };
        const gymFee = GYM_WEEKLY[gymMembership];
        if (stats.money + moneyDelta >= gymFee) {
          moneyDelta -= gymFee;
        } else {
          setGymMembership(null);
          setGymMembershipStartDay(null);
          setEventLog((prev) => [{
            id: Date.now() + 2000,
            text: 'You could not afford your gym membership this week and it was cancelled.',
            timestamp: formatTimestamp(newYear, newDayOfYear, newHourOfDay),
            effects: {},
          }, ...prev]);
        }
      }

      if (newRentOverdue && newDayOfYear >= newRentOverdueSinceDay + RENT_GRACE_DAYS) {
        newSelectedApartment = liveWithParentsApartment;
        newRentOverdue = false;
        setRentOverdue(false);
        setRentOverdueSinceDay(0);
        setSelectedApartment(liveWithParentsApartment);
        const evictEntry: LogEntry = {
          id: Date.now() + 1000,
          text: '📱 You failed to pay rent in time and were evicted. You moved back in with your parents.',
          timestamp: formatTimestamp(newYear, newDayOfYear, newHourOfDay),
          effects: {},
        };
        setEventLog((prev) => [evictEntry, ...prev]);
      }

      if (newSelectedApartment?.id && newSelectedApartment.id !== LIVE_WITH_PARENTS_ID) {
        if (!hasFridge(homeFurniture) && (groceryR > 0 || groceryL > 0)) {
          if (groceryR > 0 && (groceryL === 0 || Math.random() < 0.55)) {
            groceryR -= 1;
            spoilRegular += 1;
          } else if (groceryL > 0) {
            groceryL -= 1;
            spoilLux += 1;
          }
        }
        const fe = getFridgeDailyEffects(homeFurniture);
        furnitureHappinessDelta += fe.happiness;
        furnitureHungerDelta += fe.hunger;
      }
    }

    setGroceries({ regular: groceryR, lux: groceryL });
    if (spoilRegular > 0 || spoilLux > 0) {
      const parts: string[] = [];
      if (spoilRegular > 0) parts.push(`${spoilRegular} regular meal(s)`);
      if (spoilLux > 0) parts.push(`${spoilLux} luxury meal(s)`);
      setEventLog((prev) => [
        {
          id: Date.now() + 150,
          text: `Food spoiled (no refrigerator): lost ${parts.join(' and ')}.`,
          timestamp: formatTimestamp(newYear, newDayOfYear, newHourOfDay),
          effects: {},
        },
        ...prev,
      ]);
    }

    setRentOverdue(newRentOverdue);
    setRentOverdueSinceDay(newRentOverdueSinceDay);
    setLastRentPaidSeasonEndDay(newLastRentPaidSeasonEndDay);
    if (newSelectedApartment !== selectedApartment) setSelectedApartment(newSelectedApartment);

    const baseHappiness =
      stats.happiness + (effect.happiness || 0) + happinessDeltaFromParents + furnitureHappinessDelta;
    const baseHealth = stats.health + (effect.health || 0) + healthDeltaFromDaily;
    let newStats = {
      ...stats,
      year: newYear,
      dayOfYear: newDayOfYear,
      hourOfDay: newHourOfDay,
      health: round2(Math.max(0, Math.min(100, baseHealth))),
      happiness: round2(Math.max(0, Math.min(100, baseHappiness))),
      energy: round2(Math.max(0, Math.min(100, stats.energy + (effect.energy || 0)))),
      hunger: round2(
        Math.max(0, Math.min(100, stats.hunger + (effect.hunger ?? 0) + furnitureHungerDelta))
      ),
      money: Math.max(0, stats.money + moneyDelta),
      smarts: round2(Math.max(0, Math.min(10, stats.smarts + (effect.smarts || 0)))),
    };

    // If hunger has dropped to 0, start draining health additionally.
    if (newStats.hunger <= 0) {
      newStats.health = round2(Math.max(0, newStats.health - 2));
    }

    const lifeStage = getLifeStage(newStats.year, newStats.dayOfYear, newStats.birthYear);
    const yearsAlive = getYearsAlive(newStats.year, newStats.dayOfYear, newStats.birthYear);
    if (lifeStage === 'elderly') {
      newStats.health = round2(Math.max(0, newStats.health - Math.floor(hoursPassed / 168)));
    }

    setStats(newStats);
    setActivityCount((prev) => prev + 1);

    // Log only actual applied changes (after rounding) so we never show 0.00
    const appliedHealth = round2(newStats.health - stats.health);
    const appliedHappiness = round2(newStats.happiness - stats.happiness);
    const appliedEnergy = round2(newStats.energy - stats.energy);
    const appliedHunger = round2(newStats.hunger - stats.hunger);
    const appliedSmarts = round2(newStats.smarts - stats.smarts);
    const appliedMoney = round2(newStats.money - stats.money);
    const logEffects: LogEntry['effects'] = {};
    if (appliedHealth !== 0) logEffects.health = appliedHealth;
    if (appliedHappiness !== 0) logEffects.happiness = appliedHappiness;
    if (appliedEnergy !== 0) logEffects.energy = appliedEnergy;
    if (appliedHunger !== 0) logEffects.hunger = appliedHunger;
    if (appliedMoney !== 0) logEffects.money = appliedMoney;
    if (appliedSmarts !== 0) logEffects.smarts = appliedSmarts;

    const logText = happinessDeltaFromParents < 0
      ? `${resultText} (Living with parents: limited independence, -${Math.abs(happinessDeltaFromParents).toFixed(2)} happiness.)`
      : resultText;
    const newLogEntry: LogEntry = {
      id: Date.now(),
      text: logText,
      timestamp: formatTimestamp(newStats.year, newStats.dayOfYear, newStats.hourOfDay),
      effects: logEffects,
    };
    setEventLog((prev) => [newLogEntry, ...prev]);

    if (yearsAlive >= 80 || newStats.health <= 0) {
      setTimeout(() => setStage('gameover'), 1000);
    }
  };

  const handleMapActivity = (
    effect: { health?: number; happiness?: number; energy?: number; hunger?: number; money?: number; smarts?: number },
    resultText: string,
    hoursPassed: number,
    overrideRentPerSeason?: number
  ) => advanceTime(effect, resultText, hoursPassed, overrideRentPerSeason);

  const [tuitionPaidThroughSeasonEndDay, setTuitionPaidThroughSeasonEndDay] = useState<number | null>(null);

  const payTuitionForCurrentSeason = (forNextSeason: boolean = false): number | null => {
    const TUITION_PER_YEAR = 4000;
    const TUITION_PER_SEASON = TUITION_PER_YEAR / 4;
    const SEASON_END_DAYS = [28, 56, 84, 112];
    const seasonIndex = SEASON_END_DAYS.findIndex((d) => d >= stats.dayOfYear);
    const currentSeasonIndex = seasonIndex >= 0 ? seasonIndex : SEASON_END_DAYS.length - 1;

    const targetSeasonIndex = forNextSeason
      ? (currentSeasonIndex + 1) % SEASON_END_DAYS.length
      : currentSeasonIndex;
    const seasonEnd = SEASON_END_DAYS[targetSeasonIndex];

    const SEASON_NAMES = ['Spring', 'Summer', 'Fall', 'Winter'] as const;
    const seasonLabel = SEASON_NAMES[targetSeasonIndex];
    const seasonYear =
      forNextSeason && currentSeasonIndex === SEASON_END_DAYS.length - 1
        ? stats.year + 1
        : stats.year;

    // If we've already paid through this target season, just acknowledge it.
    if (tuitionPaidThroughSeasonEndDay != null && tuitionPaidThroughSeasonEndDay >= seasonEnd) {
      const alreadyPaidEntry: LogEntry = {
        id: Date.now(),
        text: `You already paid tuition for ${seasonLabel} ${seasonYear}. Thanks for staying on top of it!`,
        timestamp: formatTimestamp(stats.year, stats.dayOfYear),
        effects: {},
      };
      setEventLog((prev) => [alreadyPaidEntry, ...prev]);
      return null;
    }

    let tuitionForSeason: number;
    if (forNextSeason) {
      // Always full season when prepaying for next season.
      tuitionForSeason = TUITION_PER_SEASON;
    } else {
      const daysLeftInSeason = seasonEnd - stats.dayOfYear + 1;
      const isProrated = daysLeftInSeason < DAYS_PER_SEASON;
      tuitionForSeason = isProrated
        ? Math.round((daysLeftInSeason / DAYS_PER_SEASON) * TUITION_PER_SEASON)
        : TUITION_PER_SEASON;
    }

    if (stats.money < tuitionForSeason) {
      const warningEntry: LogEntry = {
        id: Date.now(),
        text: `You can't afford tuition for ${seasonLabel} ${seasonYear}. Tuition is $${tuitionForSeason.toLocaleString()}, but you only have $${stats.money.toLocaleString()}.`,
        timestamp: formatTimestamp(stats.year, stats.dayOfYear),
        effects: {},
      };
      setEventLog((prev) => [warningEntry, ...prev]);
      return null;
    }

    setStats((prev) => ({
      ...prev,
      money: Math.max(0, prev.money - tuitionForSeason),
    }));
    setTuitionPaidThroughSeasonEndDay(seasonEnd);

    const tuitionEntry: LogEntry = {
      id: Date.now(),
      text: `You paid $${tuitionForSeason.toLocaleString()} tuition for ${seasonLabel} ${seasonYear} of your degree.`,
      timestamp: formatTimestamp(stats.year, stats.dayOfYear),
      effects: { money: -tuitionForSeason },
    };
    setEventLog((prev) => [tuitionEntry, ...prev]);
    return tuitionForSeason;
  };

  const payRentNow = (): boolean => {
    if (!selectedApartment || selectedApartment.id === LIVE_WITH_PARENTS_ID) return false;
    const SEASON_END_DAYS = [28, 56, 84, 112];
    const rentForSeason =
      selectedApartment.id === UNIVERSITY_HOUSING_ID && educationLevel === 'in-progress'
        ? UNIVERSITY_HOUSING_STUDENT_RENT
        : selectedApartment.rent;
    const seasonIndex = SEASON_END_DAYS.findIndex((d) => d >= stats.dayOfYear);
    const currentSeasonEnd = seasonIndex >= 0 ? SEASON_END_DAYS[seasonIndex] : 112;
    const targetSeasonEnd = rentOverdue
      ? (rentOverdueSinceDay === 1 ? 112 : rentOverdueSinceDay - 1)
      : currentSeasonEnd;
    if (lastRentPaidSeasonEndDay != null && lastRentPaidSeasonEndDay >= targetSeasonEnd && !rentOverdue) {
      setEventLog((prev) => [{
        id: Date.now(),
        text: 'You already paid rent for this season.',
        timestamp: formatTimestamp(stats.year, stats.dayOfYear, stats.hourOfDay),
        effects: {},
      }, ...prev]);
      return false;
    }
    if (stats.money < rentForSeason) {
      setEventLog((prev) => [{
        id: Date.now(),
        text: `You can't afford rent ($${rentForSeason.toLocaleString()}). You have $${stats.money.toLocaleString()}.`,
        timestamp: formatTimestamp(stats.year, stats.dayOfYear, stats.hourOfDay),
        effects: {},
      }, ...prev]);
      return false;
    }
    setStats((prev) => ({ ...prev, money: prev.money - rentForSeason }));
    setLastRentPaidSeasonEndDay(targetSeasonEnd);
    if (rentOverdue) { setRentOverdue(false); setRentOverdueSinceDay(0); }
    setEventLog((prev) => [{
      id: Date.now(),
      text: `You paid $${rentForSeason.toLocaleString()} rent.`,
      timestamp: formatTimestamp(stats.year, stats.dayOfYear, stats.hourOfDay),
      effects: { money: -rentForSeason },
    }, ...prev]);
    return true;
  };

  const startDegree = (degree: Degree) => {
    setEducationDegree(degree);
    setEducationLevel('in-progress');
    setEducationProgress(0);
    payTuitionForCurrentSeason(false);
  };

  type StudyIntensity = 'slack' | 'normal' | 'focus';

  const DEGREE_DAYS_NORMAL = 80; // days of normal effort (8h each) to complete degree
  const STUDY_HOURS_PER_DAY = 8; // 8 hours of study = same effects as old "study for a day"

  const study = (intensity: StudyIntensity, hours: number) => {
    if (!educationDegree) return;

    // Block study if tuition for this season has not been paid.
    const SEASON_END_DAYS = [28, 56, 84, 112];
    const seasonEnd = SEASON_END_DAYS.find((d) => d >= stats.dayOfYear) ?? 112;
    if (tuitionPaidThroughSeasonEndDay == null || tuitionPaidThroughSeasonEndDay < seasonEnd) {
      const warningEntry: LogEntry = {
        id: Date.now(),
        text: 'You must pay tuition for this season before you can study your degree.',
        timestamp: formatTimestamp(stats.year, stats.dayOfYear),
        effects: {},
      };
      setEventLog((prev) => [warningEntry, ...prev]);
      return;
    }

    const scale = hours / STUDY_HOURS_PER_DAY; // 8 hours = 1 "day" worth of effects
    const progressPerDayNormal = 100 / DEGREE_DAYS_NORMAL; // 1.25% at normal
    const multipliers: Record<StudyIntensity, number> = {
      slack: 0.4 / 0.5,
      normal: 1,
      focus: 0.66 / 0.5,
    };
    const rawDelta = progressPerDayNormal * multipliers[intensity] * scale * 0.5; // half progression rate
    const progressDelta = Math.min(100 - educationProgress, Math.round(rawDelta * 100) / 100);
    const newProgress = Math.round((educationProgress + progressDelta) * 100) / 100;

    const intensityEffects: Record<
      StudyIntensity,
      { health: number; happiness: number; energy: number; hunger: number; money: number; baseSmartsGain: number }
    > = {
      slack: { health: -1, happiness: -0.5, energy: -30, hunger: -12, money: 0, baseSmartsGain: 0.25 / DEGREE_DAYS_NORMAL },
      normal: { health: -2, happiness: -1, energy: -50, hunger: -16, money: 0, baseSmartsGain: 0.4 / DEGREE_DAYS_NORMAL },
      focus: { health: -3, happiness: -2, energy: -80, hunger: -22, money: 0, baseSmartsGain: 0.55 / DEGREE_DAYS_NORMAL },
    };

    const baseEffects = intensityEffects[intensity];
    const effects = {
      health: baseEffects.health * scale,
      happiness: baseEffects.happiness * scale,
      energy: baseEffects.energy * scale,
      hunger: baseEffects.hunger * scale,
      money: baseEffects.money * scale,
      baseSmartsGain: baseEffects.baseSmartsGain * scale,
    };

    // Tuition already paid; no cost to study.

    const diminishingFactor = 1 - Math.min(1, stats.smarts / 20);
    const smartsGainRaw = effects.baseSmartsGain * diminishingFactor * 4;
    const smartsGain = Math.round(smartsGainRaw * 100) / 100;

    handleMapActivity(
      {
        health: effects.health,
        happiness: effects.happiness,
        energy: effects.energy,
        hunger: effects.hunger,
        money: effects.money,
        smarts: smartsGain,
      },
      `You studied your ${educationDegree} degree for ${hours} hour${hours !== 1 ? 's' : ''} (${intensity} effort).`,
      hours
    );

    setEducationProgress(newProgress);

    if (newProgress >= 100) {
      setEducationLevel('completed');
      setGamePhase('free-play');
      setDiplomas((prev) => (prev.includes(educationDegree) ? prev : [...prev, educationDegree]));

      const completionEntry: LogEntry = {
        id: Date.now() + 1,
        text: `You completed your ${educationDegree} degree! New career paths are now open to you.`,
        timestamp: formatTimestamp(stats.year, stats.dayOfYear),
        effects: {},
      };
      setEventLog((prev) => [completionEntry, ...prev]);
    } else {
      setEducationLevel('in-progress');
    }
  };

  const navigateTo = (
    target: GamePhase,
    opts?: { parkDistrict?: DistrictName; groceryDistrict?: DistrictName }
  ) => {
    if (target === 'park' && opts?.parkDistrict) setParkDistrict(opts.parkDistrict);
    if (target === 'grocery' && opts?.groceryDistrict) setGroceryDistrict(opts.groceryDistrict);
    const mins = getTravelMinutes(
      gamePhase,
      target,
      selectedApartment?.district,
      parkDistrict,
      groceryDistrict,
      opts?.parkDistrict,
      opts?.groceryDistrict
    );
    if (mins > 0) {
      advanceTime({ hunger: -0.5 }, `Traveled (${mins} mins).`, mins / 60);
    }
    setGamePhase(target);
  };

  const GYM_COSTS_PER_WEEK: Record<GymTier, number> = { cheap: 50, normal: 100, luxury: 200 };
  const GYM_HAPPINESS: Record<GymTier, number> = { cheap: -2, normal: 0, luxury: 2 };
  const selectGymMembership = (tier: GymTier) => {
    const weeklyCost = GYM_COSTS_PER_WEEK[tier];
    const daysRemainingInWeek = 7 - ((stats.dayOfYear - 1) % 7);
    const proratedCost = Math.round((daysRemainingInWeek / 7) * weeklyCost * 100) / 100;
    if (stats.money < proratedCost) return;
    const gymName = tier === 'cheap' ? 'Budget Gym' : tier === 'luxury' ? 'Elite Wellness' : 'FitZone';
    const isSwitch = gymMembership != null && gymMembership !== tier;
    setGymMembership(tier);
    setGymMembershipStartDay(stats.dayOfYear);
    advanceTime(
      { money: -proratedCost },
      isSwitch
        ? `You switched to ${gymName} ($${weeklyCost}/week). Prorated this week: $${proratedCost.toFixed(2)}.`
        : `You joined ${gymName} ($${weeklyCost}/week). Prorated this week: $${proratedCost.toFixed(2)}.`,
      0
    );
  };

  const gymWorkout = (tier: GymTier, intensity: 'easy' | 'normal' | 'intense') => {
    const energyCost = { easy: 2, normal: 5, intense: 10 }[intensity];
    const healthGain = { easy: 0.5, normal: 1.5, intense: 3 }[intensity];
    const hungerCost = -2;
    const happinessDelta = GYM_HAPPINESS[tier];
    if (stats.energy < energyCost) return;
    advanceTime(
      { health: healthGain, happiness: happinessDelta, energy: -energyCost, hunger: hungerCost },
      `You worked out at the gym (${intensity}) for 1 hour. Health +${healthGain}${happinessDelta !== 0 ? `, Happiness ${happinessDelta > 0 ? '+' : ''}${happinessDelta}` : ''}.`,
      1
    );
  };

  const parkWalk = () => {
    const energyCost = 1;
    const healthGain = 0.3;
    const hungerCost = -1;
    if (stats.energy < energyCost) return;
    const weather = getWeatherForDay(stats.year, stats.dayOfYear);
    const happinessBonus = isGoodWeatherForWalk(weather.quality) ? 1 : 0;
    const effects: { health?: number; happiness?: number; energy?: number; hunger?: number } = { health: healthGain, energy: -energyCost, hunger: hungerCost };
    if (happinessBonus > 0) effects.happiness = happinessBonus;
    const msg = happinessBonus > 0
      ? `You took a walk in the park for 1 hour. Nice weather! Health +0.30, Happiness +1 (free!).`
      : 'You took a walk in the park for 1 hour. Health +0.30 (free!).';
    advanceTime(effects, msg, 1);
  };

  const sleep = (hours: number) => {
    const bedBonus = getSleepEnergyBonusPerHour(homeFurniture);
    const perHour = 10 + bedBonus;
    const energyGain = Math.min(hours * perHour, 100 - stats.energy);
    advanceTime(
      { energy: energyGain },
      `You slept for ${hours} hour${hours > 1 ? 's' : ''}. Energy +${energyGain.toFixed(0)}${bedBonus > 0 ? ` (bed +${bedBonus}/hr)` : ''}.`,
      hours
    );
    setGamePhase('home');
  };

  const buyGroceries = (_option: string, meals: number, hungerPerMeal: number, cost: number) => {
    if (stats.money < cost) return;
    const isLux = hungerPerMeal >= 50;
    setGroceries((prev) => ({
      ...prev,
      [isLux ? 'lux' : 'regular']: prev[isLux ? 'lux' : 'regular'] + meals,
    }));
    advanceTime({ money: -cost }, `You bought groceries (${meals} meals, ${hungerPerMeal} hunger/meal).`, 0);
  };

  const eatMeal = (type: 'regular' | 'lux') => {
    const stoveBonus = getEatHungerBonus(homeFurniture);
    const base = type === 'regular' ? 30 : 50;
    const hungerGain = base + stoveBonus;
    const key = type;
    if (groceries[key] <= 0) return;
    setGroceries((prev) => ({ ...prev, [key]: prev[key] - 1 }));
    advanceTime(
      { hunger: hungerGain },
      `You ate a ${type} meal (15 mins). Hunger +${hungerGain}${stoveBonus > 0 ? ` (stove +${stoveBonus})` : ''}.`,
      0.25
    );
  };

  const chillAtHome = (hours: number) => {
    const decorBonus = getChillHappinessPerHour(homeFurniture);
    const happy = hours * (2 + decorBonus);
    const energyCost = -0.35 * hours;
    advanceTime(
      { happiness: happy, energy: energyCost },
      `You chilled at home for ${hours} hour${hours > 1 ? 's' : ''}. Happiness +${happy.toFixed(1)}${decorBonus > 0 ? ` (decor +${decorBonus.toFixed(2)}/hr)` : ''}.`,
      hours
    );
  };

  const buyFurniture = (itemId: string) => {
    const item = FURNITURE_BY_ID[itemId];
    if (!item || stats.money < item.cost) return;
    setHomeFurniture((prev) => {
      if (item.category === 'decoration') {
        if (prev.decorationIds.includes(item.id)) return prev;
        return { ...prev, decorationIds: [...prev.decorationIds, item.id] };
      }
      if (item.category === 'bed') return { ...prev, bedId: item.id };
      if (item.category === 'fridge') return { ...prev, fridgeId: item.id };
      return { ...prev, stoveId: item.id };
    });
    advanceTime(
      { money: -item.cost },
      `You bought ${item.icon} ${item.name} for $${item.cost.toLocaleString()}.`,
      0.5
    );
  };


  const resetGame = () => {
    setStage('intro');
    setCharacterName('');
    setSelectedCharacter(null);
    setActivityCount(0);
    setEventLog([]);
    setEducationLevel('none');
    setEducationDegree(null);
    setEducationProgress(0);
    setRentOverdue(false);
    setRentOverdueSinceDay(0);
    setLastRentPaidSeasonEndDay(null);
    setGroceries({ regular: 0, lux: 0 });
    setHomeFurniture(EMPTY_HOME_FURNITURE);
    setJobSchedule('full-time');
  };

  const getLifeSummary = () => {
    const avgStat = (stats.health + stats.happiness + stats.money) / 3;
    if (avgStat >= 70) return 'You lived a fulfilling and balanced life! 🌟';
    if (avgStat >= 50) return 'You had your ups and downs, but lived life your way. 💫';
    if (avgStat >= 30) return 'Life was challenging, but you made it through. 💪';
    return 'Life was tough, but every experience shaped who you became. 🌱';
  };

  if (stage === 'intro') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-purple-100 via-pink-100 to-blue-100">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="max-w-4xl w-full">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <Sparkles className="size-16 text-purple-500" />
              </div>
              <CardTitle className="text-3xl">Life Simulator</CardTitle>
              <CardDescription className="text-base mt-2">
                Explore the map, do activities, and live your life day by day!
              </CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-6 items-start">
              <div className="space-y-4 min-w-0">
                <div>
                  <label htmlFor="name" className="text-sm font-medium mb-2 block">
                    What's your name?
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={characterName}
                    onChange={(e) => setCharacterName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Choose your starting life path</p>
                  <p className="text-xs text-gray-500">Each path has a different look in the character view.</p>
                  <div className="grid grid-cols-1 gap-3">
                    {CHARACTER_PRESETS.map((preset) => {
                      const thumb =
                        preset.id === 'privileged' || preset.id === 'middle' || preset.id === 'struggling'
                          ? CHARACTER_PORTRAIT_URLS[preset.id as PortraitPresetId]
                          : null;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => setSelectedCharacter(preset)}
                          className={`flex gap-3 items-start text-left border rounded-lg p-3 text-sm bg-white/60 hover:bg-white transition shadow-sm ${
                            selectedCharacter?.id === preset.id
                              ? 'border-purple-500 ring-2 ring-purple-300'
                              : 'border-gray-200'
                          }`}
                        >
                          {thumb ? (
                            <img
                              src={thumb}
                              alt=""
                              width={80}
                              height={80}
                              loading="lazy"
                              decoding="async"
                              className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg object-cover object-top flex-shrink-0 ring-1 ring-black/10 shadow-sm"
                              aria-hidden
                            />
                          ) : null}
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold mb-1">{preset.name}</div>
                            <div className="text-xs text-gray-600 mb-1">{preset.description}</div>
                            <div className="text-xs space-y-0.5">
                              <div>Money: ${preset.startingMoney.toLocaleString()}</div>
                              <div>Beauty: {preset.beauty.toFixed(2)}/10</div>
                              <div>Smarts: {preset.smarts}/10</div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <Button
                  onClick={startGame}
                  disabled={!characterName.trim() || !selectedCharacter}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  size="lg"
                >
                  Start Your Life Journey
                </Button>
              </div>
              <div className="md:sticky md:top-4 rounded-xl border border-purple-100 bg-white/40 p-3">
                <p className="text-center text-xs font-semibold text-purple-800 uppercase tracking-wide mb-2">
                  Character view
                </p>
                <CharacterPortrait
                  variant="intro"
                  presetId={selectedCharacter?.id ?? null}
                  name={characterName.trim() || 'Your sim'}
                  subtitle={selectedCharacter?.name ?? undefined}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (stage === 'gameover') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-orange-100 via-red-100 to-purple-100">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="max-w-2xl">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl">Life Complete</CardTitle>
              <CardDescription className="text-lg mt-2">
                Here's how {characterName}'s life unfolded...
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <p className="text-lg font-medium">{getLifeSummary()}</p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="size-5 text-gray-600" />
                      <span className="font-medium">Final Age</span>
                    </div>
                    <span className="text-2xl font-bold">{formatTimestamp(stats.year, stats.dayOfYear, stats.hourOfDay)}</span>
                  </div>
                  <div className="text-sm text-gray-600 text-center">
                    You completed {activityCount} activities throughout your life
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Heart className="size-5 text-red-500" />
                      <span className="font-medium">Health</span>
                    </div>
                    <span className="font-bold">{stats.health.toFixed(2)}%</span>
                  </div>
                  <Progress value={stats.health} className="h-3" />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Smile className="size-5 text-yellow-500" />
                      <span className="font-medium">Happiness</span>
                    </div>
                    <span className="font-bold">{stats.happiness.toFixed(2)}%</span>
                  </div>
                  <Progress value={stats.happiness} className="h-3" />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Coins className="size-5 text-green-500" />
                      <span className="font-medium">Wealth</span>
                    </div>
                    <span className="font-bold">{stats.money}%</span>
                  </div>
                  <Progress value={stats.money} className="h-3" />
                </div>
              </div>

              <Button
                onClick={resetGame}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                size="lg"
              >
                Live Another Life
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden p-2 bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100">
      <Dialog open={showAlreadyPaidRentDialog} onOpenChange={(open) => !open && (setShowAlreadyPaidRentDialog(false), setPendingMoveApartment(null))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Already paid rent</DialogTitle>
            <DialogDescription>
              You already paid rent for your current place for this period (no refund). Are you sure you want to move?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => (setShowAlreadyPaidRentDialog(false), setPendingMoveApartment(null))}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (pendingMoveApartment) {
                  selectApartment(pendingMoveApartment);
                  setPendingMoveApartment(null);
                  setShowAlreadyPaidRentDialog(false);
                }
              }}
            >
              Yes, move
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={inventoryOpen} onOpenChange={setInventoryOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Inventory</DialogTitle>
            <DialogDescription>Your current items and resources.</DialogDescription>
          </DialogHeader>
          <div className="text-sm space-y-2">
            <div>
              <span className="font-semibold">Money:</span> ${stats.money.toLocaleString()}
            </div>
            <div>
              <span className="font-semibold">Groceries:</span> {groceries.regular} regular meals, {groceries.lux} luxury meals
            </div>
            {funItems.length > 0 && (
              <div>
                <span className="font-semibold">Fun items:</span>{' '}
                {funItems.map((id) => FUN_ITEM_NAMES[id] ?? id).join(', ')}
              </div>
            )}
            <div>
              <span className="font-semibold">Home:</span> {selectedApartment ? selectedApartment.name : 'No home'}
            </div>
            {diplomas.length > 0 && (
              <div>
                <span className="font-semibold">Diplomas:</span>{' '}
                {diplomas.map((d) => `${d.charAt(0).toUpperCase()}${d.slice(1)}`).join(', ')}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInventoryOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={phoneOpen} onOpenChange={setPhoneOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Phone</DialogTitle>
            <DialogDescription>Messages and important notices.</DialogDescription>
          </DialogHeader>
          <div className="max-h-64 overflow-y-auto text-sm space-y-2">
            {rentOverdue && selectedApartment && selectedApartment.rent > 0 && (
              <div className="border-l-4 border-amber-500 pl-2 py-1 bg-amber-50 rounded-r">
                <div className="text-[10px] text-gray-500 mb-0.5">Now</div>
                <div>📱 Rent is overdue! Pay within {RENT_GRACE_DAYS} days to avoid eviction.</div>
                <div className="mt-1">
                  <Button
                    size="sm"
                    className="h-6 px-2 text-[10px]"
                    onClick={() => payRentNow()}
                  >
                    Pay rent
                  </Button>
                </div>
              </div>
            )}
            {eventLog
              .filter((e) => e.text.startsWith('📱'))
              .map((e) => (
                <div key={e.id} className="border-l-4 border-blue-400 pl-2 py-1 bg-blue-50 rounded-r">
                  <div className="text-[10px] text-gray-500 mb-0.5">{e.timestamp}</div>
                  <div>{e.text}</div>
                  {e.text.includes('Tuition reminder') && (
                    <div className="mt-1">
                      <Button
                        size="sm"
                        className="h-6 px-2 text-[10px]"
                        onClick={() => {
                          payTuitionForCurrentSeason(true);
                        }}
                      >
                        Pay tuition for next season
                      </Button>
                    </div>
                  )}
                  {e.text.includes('Rent reminder') && (
                    <div className="mt-1">
                      <Button
                        size="sm"
                        className="h-6 px-2 text-[10px]"
                        onClick={() => {
                          payRentNow();
                        }}
                      >
                        Pay rent
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            {eventLog.filter((e) => e.text.startsWith('📱')).length === 0 && !(rentOverdue && selectedApartment && selectedApartment.rent > 0) && (
              <p className="text-xs text-gray-500">No messages yet.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPhoneOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={dailyActivitiesOpen} onOpenChange={setDailyActivitiesOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListChecks className="size-4" />
              Daily Activities
            </DialogTitle>
            <DialogDescription>
              Complete these activities for today ({dailyState.date}). Rewards reset each real-world day.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {dailyState.activities.map((activity) => {
              const completed = dailyState.completedIds.has(activity.id);
              return (
                <div
                  key={activity.id}
                  className={`rounded-lg border-2 p-3 ${
                    completed
                      ? 'border-green-200 bg-green-50/50'
                      : 'border-gray-200 bg-white hover:border-purple-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm flex items-center gap-1.5">
                        {activity.name}
                        {completed && (
                          <span className="text-green-600 text-xs">✓ Completed</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mt-0.5">{activity.description}</p>
                      <div className="flex items-center gap-1 mt-1.5">
                        <Gift className="size-3 text-amber-500" />
                        <span className="text-xs font-medium text-amber-700">
                          Reward: {activity.rewardLabel}
                        </span>
                      </div>
                    </div>
                    {!completed && (
                      <Button
                        size="sm"
                        className="shrink-0"
                        onClick={() => claimDailyActivity(activity)}
                      >
                        Claim
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDailyActivitiesOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col min-h-0">
        {/* Stats Display - compact */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-shrink-0 mb-2"
        >
          <Card>
            <CardContent className="pt-3 pb-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-x-3">
                <div className="sm:border-r sm:border-gray-200 sm:pr-2">
                  <div className="flex items-center gap-1 mb-0.5">
                    <Calendar className="size-3.5 text-gray-600" />
                    <span className="text-xs font-medium">Date & Time</span>
                  </div>
                  <div className="flex gap-0.5 mb-0.5 flex-wrap max-w-full">
                    {DAY_NAMES_SHORT.map((name, i) => {
                      const isCurrent = (stats.dayOfYear - 1) % 7 === i;
                      return (
                        <motion.div
                          key={name}
                          layout
                          animate={{ scale: isCurrent ? 1.05 : 1 }}
                          transition={{ duration: 0.25 }}
                          className={`min-w-0 px-1 py-0.5 rounded text-[9px] font-medium ${
                            isCurrent ? 'bg-purple-600 text-white ring-1 ring-purple-300' : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {name.slice(0, 2)}
                        </motion.div>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => setCalendarOverlayOpen(true)}
                    className="text-xs font-bold text-left hover:underline decoration-dotted cursor-pointer"
                  >
                    {formatTimestamp(stats.year, stats.dayOfYear, stats.hourOfDay)}
                  </button>
                  {(() => {
                    const toNext = getYearsToNextLifeStage(stats.year, stats.dayOfYear, stats.birthYear);
                    return toNext ? (
                      <div className="text-[10px] text-gray-600 mt-0.5">
                        {toNext.yearsLeft} {toNext.yearsLeft === 1 ? 'year' : 'years'} to {toNext.nextStage}
                      </div>
                    ) : null;
                  })()}
                  {(() => {
                    const w = getWeatherForDay(stats.year, stats.dayOfYear);
                    return (
                      <div className="text-[10px] text-gray-600 flex items-center gap-1 mt-0.5">
                        <Cloud className="size-3" />
                        {w.type} · {w.tempF}°F · {w.quality} weather
                      </div>
                    );
                  })()}
                  <div className="mt-1 flex gap-1 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 text-[10px]"
                      onClick={() => setDailyActivitiesOpen(true)}
                    >
                      <ListChecks className="size-3 mr-1" />
                      Daily Activities
                      {dailyState.activities.some((a) => !dailyState.completedIds.has(a.id)) && (
                        <span className="ml-1 rounded-full bg-purple-500 text-white text-[8px] px-1">
                          {dailyState.activities.filter((a) => !dailyState.completedIds.has(a.id)).length}
                        </span>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 text-[10px]"
                      onClick={() => setInventoryOpen(true)}
                    >
                      Inventory
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 text-[10px]"
                      onClick={() => setPhoneOpen(true)}
                    >
                      Phone
                    </Button>
                  </div>
                  <Dialog open={calendarOverlayOpen} onOpenChange={setCalendarOverlayOpen}>
                    <DialogContent className="sm:max-w-md bg-white">
                      <DialogHeader>
                        <DialogTitle className="text-lg">
                          Year {stats.year} · {['Spring', 'Summer', 'Fall', 'Winter'][Math.floor((stats.dayOfYear - 1) / DAYS_PER_SEASON)]} · Week {Math.floor(((stats.dayOfYear - 1) % DAYS_PER_SEASON) / DAYS_PER_WEEK) + 1}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-2">
                        <div className="grid grid-cols-7 gap-1 text-[10px] font-medium text-gray-600">
                          {DAY_NAMES_SHORT.map((d) => (
                            <div key={d} className="text-center">{d}</div>
                          ))}
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                          {Array.from({ length: DAYS_PER_SEASON }, (_, i) => i + 1).map((d) => {
                            const dayInSeason = ((stats.dayOfYear - 1) % DAYS_PER_SEASON) + 1;
                            const isCurrent = d === dayInSeason;
                            return (
                              <div
                                key={d}
                                className={`aspect-square flex items-center justify-center rounded text-xs font-medium ${
                                  isCurrent ? 'bg-purple-600 text-white ring-2 ring-purple-400' : 'bg-gray-100 text-gray-700'
                                }`}
                              >
                                {d}
                              </div>
                            );
                          })}
                        </div>
                        <div className="text-xs text-gray-500 pt-2">
                          {formatTime(stats.hourOfDay)} · Day {stats.dayOfYear} of {DAYS_PER_YEAR}
                        </div>
                        <div className="pt-2 border-t">
                          <div className="flex items-center gap-1 mb-1">
                            <Cloud className="size-3.5 text-sky-500" />
                            <span className="text-xs font-medium">7-day forecast</span>
                          </div>
                          <div className="grid grid-cols-7 gap-0.5 text-[9px]">
                            {getWeekForecast(stats.year, stats.dayOfYear).map(({ dayOfYear, weather }, i) => (
                              <div key={dayOfYear} className="text-center p-1 rounded bg-gray-50">
                                <div className="font-medium">{DAY_NAMES_SHORT[i]}</div>
                                <div className="text-lg leading-none my-0.5">{getWeatherIcon(weather.type, weather.quality)}</div>
                                <div className="text-gray-600 truncate" title={weather.type}>{weather.type}</div>
                                <div>{weather.tempF}°F</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Button variant="outline" size="sm" onClick={passOneHour} className="text-[10px] h-6 px-1.5">
                      Pass 1 Hr
                    </Button>
                    <span className="text-[10px] text-gray-500">{activityCount} done</span>
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 p-2 space-y-2 sm:border-l-0">
                  <div className="text-xs font-semibold text-gray-900">Basic Needs</div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1 mb-0.5">
                        <Heart className="size-3 text-red-500 shrink-0" />
                        <span className="text-[10px] font-medium truncate">Health</span>
                      </div>
                      <div className="text-[9px] text-gray-500 truncate mb-0.5">{getHealthMood(stats.health)}</div>
                      <div className="flex items-center gap-0.5">
                        <Progress value={stats.health} className="h-1 flex-1 min-w-0" />
                        <span className="text-[10px] font-bold shrink-0">{stats.health.toFixed(0)}</span>
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1 mb-0.5">
                        <Smile className="size-3 text-yellow-500 shrink-0" />
                        <span className="text-[10px] font-medium truncate">Happiness</span>
                      </div>
                      <div className="text-[9px] text-gray-500 truncate mb-0.5">{getHappinessMood(stats.happiness)}</div>
                      <div className="flex items-center gap-0.5">
                        <Progress value={stats.happiness} className="h-1 flex-1 min-w-0" />
                        <span className="text-[10px] font-bold shrink-0">{stats.happiness.toFixed(0)}</span>
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1 mb-0.5">
                        <Zap className="size-3 text-amber-500 shrink-0" />
                        <span className="text-[10px] font-medium truncate">Energy</span>
                      </div>
                      <div className="text-[9px] text-gray-500 truncate mb-0.5">{getEnergyMood(stats.energy)}</div>
                      <div className="flex items-center gap-0.5">
                        <Progress value={stats.energy} className="h-1 flex-1 min-w-0" />
                        <span className="text-[10px] font-bold shrink-0">{stats.energy.toFixed(0)}</span>
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1 mb-0.5">
                        <UtensilsCrossed className="size-3 text-orange-500 shrink-0" />
                        <span className="text-[10px] font-medium truncate">Hunger</span>
                      </div>
                      <div className="text-[9px] text-gray-500 truncate mb-0.5">{getHungerMood(stats.hunger)}</div>
                      <div className="flex items-center gap-0.5">
                        <Progress value={stats.hunger} className="h-1 flex-1 min-w-0" />
                        <span className="text-[10px] font-bold shrink-0">{stats.hunger.toFixed(0)}</span>
                      </div>
                    </div>
                  </div>
                </div>
                </div>

                <div className="space-y-2 border-l border-gray-200 pl-2 md:pl-3">
                  <div className="text-[10px] font-semibold text-gray-600 uppercase tracking-wide">Play stats</div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <div className="flex items-center gap-1 mb-0.5">
                        <Coins className="size-3.5 text-green-500" />
                        <span className="text-xs font-medium">Money</span>
                      </div>
                      <div className="text-base font-bold">${stats.money.toLocaleString()}</div>
                      <div className="text-[10px] text-gray-500 mt-0.5">
                        {selectedApartment && (rentOverdue
                          ? `Rent overdue! (${RENT_GRACE_DAYS}d grace)`
                          : `Rent $${selectedApartment.rent}/season`)}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-1 mb-0.5">
                        <Sparkles className="size-3.5 text-pink-500" />
                        <span className="text-xs font-medium">Beauty</span>
                      </div>
                      <div className="text-base font-bold">{stats.beauty.toFixed(2)}/10</div>
                    </div>
                    <div>
                      <div className="flex items-center gap-1 mb-0.5">
                        <ScrollText className="size-3.5 text-indigo-500" />
                        <span className="text-xs font-medium">Smarts</span>
                      </div>
                      <div className="text-base font-bold">{stats.smarts.toFixed(2)}/10</div>
                    </div>
                  </div>
                  <div className="border-t border-gray-200 pt-2 mt-1">
                    <div className="text-[10px] font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Status</div>
                    <div className="grid grid-cols-3 gap-2 text-[11px] text-gray-700">
                    <div>
                      <div className="font-semibold text-gray-900 text-xs flex items-center gap-1">
                        <Home className="size-3.5 text-emerald-600" />
                        Home
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <div className="truncate">{selectedApartment ? selectedApartment.name : 'No home'}</div>
                        {selectedApartment && (
                          <div className="text-[10px] text-gray-500 truncate">District: {selectedApartment.district}</div>
                        )}
                        {selectedApartment && (
                          gamePhase === 'home' ? (
                            <span className="text-emerald-600 text-[10px] font-medium">You are home</span>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-1.5 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 w-fit"
                              onClick={() => {
                                setMapOverlayOpen(true);
                                setPendingGoHomeAnimation(true);
                              }}
                            >
                              Go home
                            </Button>
                          )
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 text-xs flex items-center gap-1">
                        <Briefcase className="size-3.5 text-blue-500" />
                        Job
                      </div>
                      {selectedJob ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="cursor-help underline decoration-dotted decoration-gray-400 truncate">
                              {getCurrentJobTitle(selectedJob)}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="max-w-xs text-left">
                            <div className="space-y-2 whitespace-pre-line text-sm">
                              {getJobScheduleLabel(selectedJob, jobSchedule)}
                              <div className="border-t border-white/20 pt-2 mt-2 font-medium">
                                Pay: ${salaryPerDay(selectedJob).toFixed(2)}/day · ${salaryPerHour(selectedJob).toFixed(2)}/hr
                                <br />
                                ${(salaryPerDay(selectedJob) * 7).toFixed(2)}/week · ${getEffectiveSalary(selectedJob).toFixed(2)}/season
                              </div>
                              <div>Performance: {getPerformanceGrade(jobPerformance)} ({jobPerformance.toFixed(0)}%)</div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <div className="truncate">No job</div>
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 text-xs flex items-center gap-1">
                        <GraduationCap className="size-3.5 text-indigo-600" />
                        Education
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <div>
                          {educationLevel === 'none' || !educationDegree
                            ? 'Not in school'
                            : educationLevel === 'completed'
                              ? `Completed ${educationDegree!.charAt(0).toUpperCase()}${educationDegree!.slice(
                                  1
                                )} degree`
                              : `Studying ${educationDegree!.charAt(0).toUpperCase()}${educationDegree!.slice(
                                  1
                                )} (${educationProgress.toFixed(2)}%)`}
                        </div>
                        {educationLevel === 'in-progress' && gamePhase !== 'school' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-1.5 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 w-fit"
                            onClick={() => {
                              setMapOverlayOpen(true);
                              setPendingGoToSchoolAnimation(true);
                            }}
                          >
                            Go to school
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Main Content: Map and Event Log - fill remaining height, no page scroll */}
        <div className="grid md:grid-cols-3 gap-2 flex-1 min-h-0">
          {/* Map - Takes 2/3 of the space */}
          <div className="md:col-span-2 min-h-0 flex flex-col flex-1">
            <InteractiveMap
              stats={stats}
              onActivityComplete={handleMapActivity}
              gamePhase={gamePhase}
              apartments={APARTMENTS}
              jobs={JOBS}
              onSelectApartment={(apt) => {
                if (selectedApartment != null && lastRentPaidSeasonEndDay != null) {
                  setPendingMoveApartment(apt);
                  setShowAlreadyPaidRentDialog(true);
                } else {
                  selectApartment(apt);
                }
              }}
              selectedJob={selectedJob}
              onSelectJob={selectJob}
              jobSchedule={jobSchedule}
              setJobSchedule={setJobSchedule}
              onWorkShift={(intensity) => workShift(0, intensity)}
              onWorkOvertime={(intensity) => workShift(2, intensity)}
              workHoursPerShift={workHoursPerShift()}
              canWorkNow={canWorkNow()}
              canWorkOvertimeNow={canWorkOvertimeNow()}
              isFirstDayOfWork={selectedJob != null && !hasWaitedFirstDayForJob()}
              onPassOneHour={passOneHour}
              getSalaryPerDay={salaryPerDay}
              getSalaryPerHour={salaryPerHour}
              getEffectiveSalary={getEffectiveSalary}
              getCurrentJobTitle={getCurrentJobTitle}
              promotionCheck={{ ...canAskForPromotion(), chance: getPromotionChance() }}
              onAskForPromotion={askForPromotion}
              onGoToSchool={() => navigateTo('school')}
              onGoToJobSelection={() => navigateTo('selecting-job')}
              onGoToHomeSelection={() => navigateTo('selecting-home')}
              onGoToHome={() => navigateTo('home')}
              onGoToGym={() => navigateTo('gym')}
              onGoToPark={(district: DistrictName) => navigateTo('park', { parkDistrict: district })}
              onGoToGrocery={(district: DistrictName) => navigateTo('grocery', { groceryDistrict: district })}
              onGoToCityView={() => navigateTo('free-play')}
              onBuyGroceries={buyGroceries}
              selectedApartment={selectedApartment}
              gymMembership={gymMembership}
              onSelectGymMembership={selectGymMembership}
              onGymWorkout={gymWorkout}
              onParkWalk={parkWalk}
              onSleep={sleep}
              onEatMeal={eatMeal}
              onChill={chillAtHome}
              onBuyFurniture={buyFurniture}
              homeFurniture={homeFurniture}
              isLiveWithParents={selectedApartment?.id === LIVE_WITH_PARENTS_ID}
              groceries={groceries}
              educationLevel={educationLevel}
              educationDegree={educationDegree}
              educationProgress={educationProgress}
              currentMoney={stats.money}
              currentRent={selectedApartment?.rent ?? 0}
              rentOverdue={rentOverdue}
              universityHousingStudentRent={UNIVERSITY_HOUSING_STUDENT_RENT}
              dayOfYear={stats.dayOfYear}
              onStartDegree={startDegree}
              onStudy={(intensity, hours) => study(intensity, hours)}
              currentWeather={getWeatherForDay(stats.year, stats.dayOfYear)}
              parkDistrict={parkDistrict}
              groceryDistrict={groceryDistrict}
              getTravelMinutes={(target, destDistrict) =>
                getTravelMinutes(
                  gamePhase,
                  target,
                  selectedApartment?.district,
                  parkDistrict,
                  groceryDistrict,
                  target === 'park' ? destDistrict : undefined,
                  target === 'grocery' ? destDistrict : undefined
                )
              }
              mapOverlayOpen={mapOverlayOpen}
              onCloseMapOverlay={() => setMapOverlayOpen(false)}
              pendingGoHomeAnimation={pendingGoHomeAnimation}
              onGoHomeAnimationDone={() => setPendingGoHomeAnimation(false)}
              pendingGoToSchoolAnimation={pendingGoToSchoolAnimation}
              onGoToSchoolAnimationDone={() => setPendingGoToSchoolAnimation(false)}
              onOpenMapOverlay={() => setMapOverlayOpen(true)}
            />
          </div>

          {/* Character view + compact event log + Developer Cheats - right column */}
          <div className="md:col-span-1 min-h-0 flex flex-col gap-2 flex-1">
            <Card className="flex flex-col flex-[2] min-h-0 border-indigo-100/80 bg-gradient-to-b from-white to-indigo-50/30">
              <CardHeader className="flex-shrink-0 py-2 pb-1">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Sparkles className="size-4 text-violet-500" />
                  Your character
                </CardTitle>
                <CardDescription className="text-xs">
                  {characterName ? characterName : 'Sim'} · {selectedCharacter?.name ?? '—'}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 min-h-0 flex items-stretch justify-center pt-0 pb-3 px-2">
                <CharacterPortrait
                  variant="panel"
                  presetId={selectedCharacter?.id ?? null}
                  className="w-full max-w-[200px]"
                />
              </CardContent>
            </Card>

            <Card className="flex flex-col flex-none max-h-[200px] min-h-[100px] border-purple-100">
              <CardHeader className="flex-shrink-0 py-1.5 px-3">
                <CardTitle className="flex items-center gap-2 text-xs">
                  <ScrollText className="size-3.5" />
                  Event log
                </CardTitle>
                <CardDescription className="text-[10px] leading-tight">Last few activities (scroll)</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 min-h-0 overflow-hidden flex flex-col pt-0 px-3 pb-2">
                <div className="space-y-1.5 flex-1 min-h-0 overflow-y-auto pr-1 text-[11px]">
                  {eventLog.length === 0 ? (
                    <p className="text-[11px] text-gray-500 italic leading-snug">
                      No activities yet — open the map and visit a place.
                    </p>
                  ) : (
                    eventLog.map((entry) => (
                      <motion.div
                        key={entry.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="border-l-2 border-purple-400 pl-1.5 py-0.5 bg-purple-50/90 rounded-r"
                      >
                        <div className="text-[9px] font-semibold text-purple-700 mb-0.5">
                          {entry.timestamp}
                        </div>
                        <p className="text-[11px] text-gray-700 mb-0.5 leading-snug">{entry.text}</p>
                        <div className="flex gap-1 flex-wrap">
                          {entry.effects.health != null && entry.effects.health !== 0 && (
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded ${
                                entry.effects.health > 0
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-red-200 text-red-800'
                              }`}
                            >
                              ❤️ {entry.effects.health > 0 ? '+' : ''}
                              {Number(entry.effects.health).toFixed(2)}
                            </span>
                          )}
                          {entry.effects.happiness != null && entry.effects.happiness !== 0 && (
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded ${
                                entry.effects.happiness > 0
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-yellow-200 text-yellow-800'
                              }`}
                            >
                              😊 {entry.effects.happiness > 0 ? '+' : ''}
                              {Number(entry.effects.happiness).toFixed(2)}
                            </span>
                          )}
                          {entry.effects.energy != null && entry.effects.energy !== 0 && (
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded ${
                                entry.effects.energy > 0
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-amber-200 text-amber-800'
                              }`}
                            >
                              ⚡ {entry.effects.energy > 0 ? '+' : ''}
                              {Number(entry.effects.energy).toFixed(2)}
                            </span>
                          )}
                          {entry.effects.hunger != null && entry.effects.hunger !== 0 && (
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded ${
                                entry.effects.hunger > 0
                                  ? 'bg-orange-100 text-orange-700'
                                  : 'bg-orange-200 text-orange-800'
                              }`}
                            >
                              🍽️ {entry.effects.hunger > 0 ? '+' : ''}
                              {Number(entry.effects.hunger).toFixed(2)}
                            </span>
                          )}
                          {entry.effects.money != null && entry.effects.money !== 0 && (
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded ${
                                entry.effects.money > 0
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-green-200 text-green-800'
                              }`}
                            >
                              💰 {entry.effects.money > 0 ? '+' : ''}
                              {Number(entry.effects.money).toFixed(2)}
                            </span>
                          )}
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Developer Cheats - only when playing */}
            {stage === 'playing' && (
              <Card className="flex-shrink-0 border-amber-200 bg-amber-50/50">
                <CardHeader
                  className="flex flex-row items-center justify-between py-1.5 px-3 cursor-pointer"
                  onClick={() => {
                    setDevCheatsOpen((o) => !o);
                    if (!devCheatsOpen) loadDevFormFromStats();
                  }}
                >
                  <CardTitle className="flex items-center gap-1.5 text-xs font-medium text-amber-800">
                    <Wrench className="size-3.5" />
                    Developer cheats
                  </CardTitle>
                  <span className="text-[10px] text-amber-600">{devCheatsOpen ? '▼' : '▶'}</span>
                </CardHeader>
                {devCheatsOpen && (
                  <CardContent className="pt-0 px-3 pb-3 space-y-2">
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[11px]">
                      <label className="flex items-center gap-1">
                        <span className="w-14 shrink-0">Health</span>
                        <Input
                          type="number"
                          step="0.01"
                          min={0}
                          max={100}
                          value={devForm.health}
                          onChange={(e) => setDevForm((f) => ({ ...f, health: e.target.value }))}
                          className="h-6 text-[11px] py-0"
                        />
                      </label>
                      <label className="flex items-center gap-1">
                        <span className="w-14 shrink-0">Happiness</span>
                        <Input
                          type="number"
                          step="0.01"
                          min={0}
                          max={100}
                          value={devForm.happiness}
                          onChange={(e) => setDevForm((f) => ({ ...f, happiness: e.target.value }))}
                          className="h-6 text-[11px] py-0"
                        />
                      </label>
                      <label className="flex items-center gap-1">
                        <span className="w-14 shrink-0">Energy</span>
                        <Input
                          type="number"
                          step="0.01"
                          min={0}
                          max={100}
                          value={devForm.energy}
                          onChange={(e) => setDevForm((f) => ({ ...f, energy: e.target.value }))}
                          className="h-6 text-[11px] py-0"
                        />
                      </label>
                      <label className="flex items-center gap-1">
                        <span className="w-14 shrink-0">Hunger</span>
                        <Input
                          type="number"
                          step="0.01"
                          min={0}
                          max={100}
                          value={devForm.hunger}
                          onChange={(e) => setDevForm((f) => ({ ...f, hunger: e.target.value }))}
                          className="h-6 text-[11px] py-0"
                        />
                      </label>
                      <label className="flex items-center gap-1">
                        <span className="w-14 shrink-0">Money</span>
                        <Input
                          type="number"
                          step="100"
                          min={0}
                          value={devForm.money}
                          onChange={(e) => setDevForm((f) => ({ ...f, money: e.target.value }))}
                          className="h-6 text-[11px] py-0"
                        />
                      </label>
                      <label className="flex items-center gap-1">
                        <span className="w-14 shrink-0">Beauty</span>
                        <Input
                          type="number"
                          step="0.01"
                          min={0}
                          max={10}
                          value={devForm.beauty}
                          onChange={(e) => setDevForm((f) => ({ ...f, beauty: e.target.value }))}
                          className="h-6 text-[11px] py-0"
                        />
                      </label>
                      <label className="flex items-center gap-1">
                        <span className="w-14 shrink-0">Smarts</span>
                        <Input
                          type="number"
                          step="0.01"
                          min={0}
                          max={10}
                          value={devForm.smarts}
                          onChange={(e) => setDevForm((f) => ({ ...f, smarts: e.target.value }))}
                          className="h-6 text-[11px] py-0"
                        />
                      </label>
                    </div>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[11px]">
                      <label className="flex items-center gap-1">
                        <span className="w-14 shrink-0">Year</span>
                        <Input
                          type="number"
                          min={START_YEAR}
                          value={devForm.year}
                          onChange={(e) => setDevForm((f) => ({ ...f, year: e.target.value }))}
                          className="h-6 text-[11px] py-0"
                        />
                      </label>
                      <label className="flex items-center gap-1">
                        <span className="w-14 shrink-0">Day (1–112)</span>
                        <Input
                          type="number"
                          min={1}
                          max={DAYS_PER_YEAR}
                          value={devForm.dayOfYear}
                          onChange={(e) => setDevForm((f) => ({ ...f, dayOfYear: e.target.value }))}
                          className="h-6 text-[11px] py-0"
                        />
                      </label>
                      <label className="flex items-center gap-1">
                        <span className="w-14 shrink-0">Hour (0–23)</span>
                        <Input
                          type="number"
                          min={0}
                          max={23}
                          value={devForm.hourOfDay}
                          onChange={(e) => setDevForm((f) => ({ ...f, hourOfDay: e.target.value }))}
                          className="h-6 text-[11px] py-0"
                        />
                      </label>
                    </div>
                    {selectedJob && (
                      <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[11px]">
                        <label className="flex items-center gap-1">
                          <span className="w-14 shrink-0">Perf %</span>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={devForm.jobPerformance}
                            onChange={(e) => setDevForm((f) => ({ ...f, jobPerformance: e.target.value }))}
                            className="h-6 text-[11px] py-0"
                          />
                        </label>
                        <label className="flex items-center gap-1">
                          <span className="w-14 shrink-0">Tier (0–{selectedJob.promotionTiers.length - 1})</span>
                          <Input
                            type="number"
                            min={0}
                            max={selectedJob.promotionTiers.length - 1}
                            value={devForm.jobTierIndex}
                            onChange={(e) => setDevForm((f) => ({ ...f, jobTierIndex: e.target.value }))}
                            className="h-6 text-[11px] py-0"
                          />
                        </label>
                      </div>
                    )}
                    {selectedJob && (
                      <div className="text-[10px] text-amber-700">
                        {(() => {
                          const info = canAskForPromotion();
                          const chance = getPromotionChance();
                          if (!info.allowed) {
                            return `Promo chance: 0% (not eligible: ${info.reason ?? 'see tooltip'})`;
                          }
                          return `Promo chance now ≈ ${(chance * 100).toFixed(0)}% (range ~20–90% based on performance & days in tier).`;
                        })()}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={loadDevFormFromStats}>
                        Load current
                      </Button>
                      <Button size="sm" className="h-6 text-[10px] bg-amber-600 hover:bg-amber-700" onClick={applyDevCheats}>
                        Apply
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-[10px] border-purple-300 text-purple-700 hover:bg-purple-50"
                        onClick={handleSimulateNextDay}
                      >
                        Simulate next day
                      </Button>
                      <select
                        className="h-6 text-[10px] px-2 rounded border border-amber-300 bg-white"
                        defaultValue=""
                        onChange={(e) => {
                          const d = e.target.value as Degree;
                          if (d) {
                            if (!diplomas.includes(d)) setDiplomas((prev) => [...prev, d]);
                            setEducationLevel('completed');
                            setEducationDegree(d);
                          }
                          e.target.value = '';
                        }}
                      >
                        <option value="">Obtain diploma…</option>
                        {(['accounting', 'engineering', 'doctor', 'finance'] as const).map((deg) => (
                          <option key={deg} value={deg}>
                            {deg.charAt(0).toUpperCase() + deg.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </CardContent>
                )}
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}