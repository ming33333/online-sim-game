import React, { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { motion, AnimatePresence } from 'motion/react';
import {
  Heart,
  Smile,
  Coins,
  Calendar,
  Sparkles,
  ScrollText,
  Clock,
  Wrench,
  Zap,
  Cloud,
  Briefcase,
  Home,
  GraduationCap,
  UtensilsCrossed,
  ListChecks,
  Gift,
  CirclePlay,
  ArrowRight,
  Package,
  Smartphone,
  Dumbbell,
  Users,
} from 'lucide-react';
import { getWeatherForDay, getWeekForecast, isGoodWeatherForWalk, getWeatherIcon } from '../lib/weather';
import { InteractiveMap } from './InteractiveMap';
import {
  EMPTY_HOME_FURNITURE,
  LIVE_WITH_PARENTS_DEFAULT_FURNITURE,
  type FurnitureItem,
  type HomeFurnitureState,
  FURNITURE_BY_ID,
  hasFridge,
  getFridgeDailyEffects,
  getFridgeMealCapacity,
  getSleepEnergyBonusPerHour,
  getEatHungerBonus,
  getChillHappinessPerHour,
  getWatchHappinessPerHour,
} from '../lib/furniture';
import {
  getSeasonShellBackgroundStyle,
  getTimeOverlayAlpha,
  getSeasonIndex,
  getSeasonName,
} from '../lib/gameBackground';
import {
  unlockMenuAudio,
  playMenuEnterSound,
  playMenuExitSound,
  INTRO_MENU_FADE_DELAY_SEC,
  INTRO_MENU_FADE_DURATION_SEC,
} from '../lib/menuSounds';
import { round2, fmt2, fmtStatOutOfTen, formatMoney } from '../lib/formatNumber';
import { gameChromePanel, gameChromePanelHeader, gameChromePanelMuted } from '../lib/gameChrome';
import {
  CharacterPortrait,
  getCharacterPortraitUrl,
  type CharacterGender,
  type PortraitPresetId,
} from './CharacterPortrait';
import { GymView } from './GymView';
import type { GymTier } from './GymView';
import { ParkView } from './ParkView';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { Input } from './ui/input';
import { Slider } from './ui/slider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { cn } from './ui/utils';
import { IntroMenu } from './IntroMenu';
import { StatScaleTooltip } from './StatScaleTooltip';
import { useStoryBeatTyping, storyBeatDialogContentClassName } from '../lib/useStoryBeatTyping';
import {
  getDailyState,
  simulateNextDay,
  completeDailyActivity,
  type DailyState,
  type DailyActivity,
} from '../lib/daily-activities';
import {
  HOURS_EARLY_WORK_START,
  HUNGER_PASS_ONE_HOUR,
  SLEEP_HUNGER_PER_HOUR,
  EAT_SNACK_HOURS,
  EAT_TOGO_MEAL_HOURS,
  WORK_CAFETERIA_MEALS,
  HUNGER_PER_WORK_HOUR,
  RENT_GRACE_DAYS,
  WORK_ENERGY_MULTIPLIER,
  WORKOUT_EFFECTS,
  daysSinceOverdueDay,
  LEAVE_WORK_PERFORMANCE_PENALTY,
  LATE_WORK_PERFORMANCE_PENALTY,
  LATE_WORK_GRACE_HOURS,
  STUDY_HUNGER_DRAIN_MULTIPLIER,
  LIVING_WITH_PARENTS_HAPPINESS_LOSS_PER_DAY,
  LIVING_WITH_PARENTS_BLOCK_FURNITURE_SELL_HAPPINESS,
  GYM_COSTS_PER_WEEK,
  GYM_HAPPINESS,
  GYM_TIER_BY_DISTRICT,
  GYM_LOUNGE_SOCIAL_PER_HOUR,
  HOME_CHILL_SOCIAL_PER_HOUR,
  PARK_WALK_SOCIAL_GAIN,
  SCHOOL_LOUNGE_SOCIAL_PER_HOUR,
  WORKOUT_FITNESS_GAIN,
  HEALTH_DECAY_WEEKLY_ADULT,
  HEALTH_DECAY_WEEKLY_YOUNG_ADULT,
  VITAL_DEPLETION_GRACE_HOURS,
  isJobOfficeOpen,
  FULL_MOON_DEWMIST_PARK_HAPPINESS,
} from '../../game/constants';
import { isFullMoonCalendarDay, isNightHour } from '../../game/calendar-events';
import {
  BACKPACK_BY_ID,
  EMPTY_SNACK_COUNTS,
  SNACK_BY_ID,
  SNACK_TYPES,
  getBackpackCapacity,
  getUsedSnackSpace,
  getUsedBackpackSpace,
  TOGO_MEAL_SPACE_UNITS,
  type BackpackId,
  type SnackId,
} from '../lib/inventory';
import {
  EMPTY_GROCERY_BUCKETS,
  rebalanceGroceriesToFridge,
  topUpParentsFridge,
  consumeOneHomeMeal,
  clampFreshnessPct,
  type GroceryBucketsState,
} from '../lib/groceries';
import {
  SKINCARE_PRODUCTS,
  HAIRCUT_OPTIONS,
  emptySkincareDoses,
  applySkincareForNewDay,
  rollWorkoutBeautyDelta,
  rollHaircutBeautyDelta,
  haircutCooldownStatus,
  WORKOUT_BEAUTY_CHANCE_PER_HOUR,
  type SkincareId,
  type HaircutId,
} from '../lib/beautyCare';
import {
  emptyNpcInteractions,
  emptyNpcRelationshipLastBumpDay,
  gameDayKey,
  pickTalkDialogue,
  npcById,
  relationshipStageLabel,
  NPC_PROFILES,
  TIER_AT,
  TALK_SOCIAL_HOURS,
  TALK_SOCIAL_SKILL,
  TALK_HAPPINESS,
  type NpcId,
} from '../lib/relationships';

/** Optional snapshot when pantry/to-go state was updated in the same tick (React state not committed yet). */
type SpoilageOverrides = {
  groceryBuckets?: GroceryBucketsState;
  togoHome?: { regular: number; lux: number };
  togoFreshHome?: { regular: number; lux: number };
  togoCarried?: { regular: number; lux: number };
  togoFreshCarried?: { regular: number; lux: number };
};

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
  fitness: number;
  social: number;
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

/** Single-line hub: "Monday - Week 1 - 9:25 AM" (global week 1–16). */
function formatHubDateTime(dayOfYear: number, hourOfDay: number): string {
  const globalWeek = Math.floor((dayOfYear - 1) / DAYS_PER_WEEK) + 1;
  return `${formatDayOfWeek(dayOfYear)} - Week ${globalWeek} - ${formatTime(hourOfDay)}`;
}

const SEASON_CELEBRATE_MS = 3200;
const SEASON_CELEBRATE_EMOJI = {
  Spring: '🌸',
  Summer: '☀️',
  Fall: '🍂',
  Winter: '❄️',
} as const satisfies Record<ReturnType<typeof getSeasonName>, string>;

/** Daily activities UI (turn off to suppress prompts and the header button). */
const DAILY_ACTIVITIES_ENABLED = false;

/** One welcome line after Play (same `useStoryBeatTyping` pacing as NPC/school/full-moon). Enter opens the menu. */
const INTRO_WELCOME_MESSAGE =
  "Welcome to Werdred! a city of small routines and big turning points. When you're ready, tap Play to hear the menu, craft your sim, and step into their story.";

/** UI / logs: whole numbers for health, happiness, energy, hunger. */
function intStat(n: number): number {
  return Math.round(n);
}

const RENT_WEEK_END_DAYS = [7, 14, 21, 28, 35, 42, 49, 56, 63, 70, 77, 84, 91, 98, 105, 112];

function getNextRentChargeDayOfYear(dayOfYear: number): number {
  return RENT_WEEK_END_DAYS.find((d) => d >= dayOfYear) ?? 112;
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
  fitness: number;
  social: number;
}

const CHARACTER_PRESETS: CharacterPreset[] = [
  {
    id: 'privileged',
    name: 'Privileged Start',
    description: 'You grew up with plenty of resources and advantages.',
    startingMoney: 5000,
    beauty: 7,
    smarts: 7,
    fitness: 7,
    social: 7,
  },
  {
    id: 'middle',
    name: 'Middle Ground',
    description: 'A fairly average start in life with some savings.',
    startingMoney: 1000,
    beauty: 5,
    smarts: 5,
    fitness: 5,
    social: 5,
  },
  {
    id: 'struggling',
    name: 'Tough Beginnings',
    description: 'Very little money, but still a chance to make it.',
    startingMoney: 0,
    beauty: 3,
    smarts: 3,
    fitness: 3,
    social: 3,
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
    beauty?: number;
    smarts?: number;
    fitness?: number;
    social?: number;
  };
}

type GameStage = 'intro' | 'playing' | 'gameover';
type GamePhase =
  | 'selecting-home'
  | 'selecting-job'
  | 'work'
  | 'free-play'
  | 'school'
  | 'home'
  | 'gym'
  | 'park'
  | 'grocery'
  | 'furniture';

// 4×4 district grid: row 0 top, row 3 bottom. Center of cell (c,r) = ((c+0.5)*25, (r+0.5)*25)
const DISTRICT_POSITIONS: Record<DistrictName, { x: number; y: number }> = {
  Dewmist: { x: 12.5, y: 12.5 },       // (0,0)
  Semba: { x: 37.5, y: 12.5 },         // (1,0)
  Centerlight: { x: 37.5, y: 62.5 },   // (1,2)
  Ellum: { x: 62.5, y: 62.5 },         // (2,2)
  Marina: { x: 37.5, y: 87.5 },        // (1,3)
};

const LOCATION_POSITIONS: Record<Exclude<GamePhase, 'home' | 'work' | 'gym'>, { x: number; y: number }> = {
  'free-play': { x: 37.5, y: 62.5 },   // Centerlight
  'school': DISTRICT_POSITIONS.Dewmist,
  'selecting-home': DISTRICT_POSITIONS.Centerlight,
  'park': DISTRICT_POSITIONS.Ellum,
  'grocery': DISTRICT_POSITIONS.Centerlight,
  'furniture': DISTRICT_POSITIONS.Centerlight,
  // Job Office (pick/accept a job offer)
  'selecting-job': DISTRICT_POSITIONS.Marina,
};

const LOCATION_PHASES: GamePhase[] = [
  'free-play',
  'school',
  'selecting-home',
  'home',
  'gym',
  'park',
  'grocery',
  'furniture',
  'selecting-job',
  'work',
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
  groceryDistrict?: DistrictName | null,
  furnitureDistrict?: DistrictName | null,
  workDistrict?: DistrictName | null,
  gymDistrict?: DistrictName | null
): { x: number; y: number } {
  if (phase === 'home' && homeDistrict) return DISTRICT_POSITIONS[homeDistrict];
  if (phase === 'home') return DISTRICT_POSITIONS.Centerlight;
  if (phase === 'gym') return DISTRICT_POSITIONS[gymDistrict ?? 'Semba'];
  if (phase === 'park') return DISTRICT_POSITIONS[parkDistrict ?? 'Ellum'];
  if (phase === 'grocery') return DISTRICT_POSITIONS[groceryDistrict ?? 'Centerlight'];
  if (phase === 'furniture') return DISTRICT_POSITIONS[furnitureDistrict ?? 'Centerlight'];
  if (phase === 'work') return DISTRICT_POSITIONS[workDistrict ?? 'Centerlight'];
  return LOCATION_POSITIONS[phase];
}

/** In-game school (Dewmist): visits and studying only in the first 14 days of each 28-day season. */
const SEASON_END_DAYS_SCHOOL = [28, 56, 84, 112] as const;
const SCHOOL_CAMPUS_OPEN_DAYS = 14;

export function getSchoolCampusAccess(dayOfYear: number): { open: boolean; closedReason: string | null } {
  const idx = SEASON_END_DAYS_SCHOOL.findIndex((d) => d >= dayOfYear);
  const seasonEnd = SEASON_END_DAYS_SCHOOL[idx >= 0 ? idx : 3];
  const seasonStart = idx <= 0 ? 1 : SEASON_END_DAYS_SCHOOL[idx - 1] + 1;
  const dayWithinSeason = dayOfYear - seasonStart + 1;
  if (dayWithinSeason > SCHOOL_CAMPUS_OPEN_DAYS) {
    return {
      open: false,
      closedReason:
        'Campus is closed after the first two weeks of the season. Return on day 1 of the next season. Pay tuition every season on your phone before you study.',
    };
  }
  return { open: true, closedReason: null };
}

function getTravelMinutes(
  from: GamePhase,
  to: GamePhase,
  homeDistrict?: DistrictName,
  fromParkDistrict?: DistrictName | null,
  fromGroceryDistrict?: DistrictName | null,
  fromFurnitureDistrict?: DistrictName | null,
  destParkDistrict?: DistrictName,
  destGroceryDistrict?: DistrictName,
  destFurnitureDistrict?: DistrictName,
  workDistrict?: DistrictName | null,
  fromGymDistrict?: DistrictName | null,
  destGymDistrict?: DistrictName
): number {
  if (from === to) {
    if (from === 'park' && destParkDistrict === fromParkDistrict) return 0;
    if (from === 'grocery' && destGroceryDistrict === fromGroceryDistrict) return 0;
    if (from === 'furniture' && destFurnitureDistrict === fromFurnitureDistrict) return 0;
    if (from === 'gym' && destGymDistrict === fromGymDistrict) return 0;
    if (from !== 'park' && from !== 'grocery' && from !== 'furniture' && from !== 'gym') return 0;
  }
  const a = getLocationPosition(
    from,
    homeDistrict,
    fromParkDistrict,
    fromGroceryDistrict,
    fromFurnitureDistrict,
    workDistrict,
    fromGymDistrict
  );
  const b = getLocationPosition(
    to,
    homeDistrict,
    destParkDistrict ?? fromParkDistrict,
    destGroceryDistrict ?? fromGroceryDistrict,
    destFurnitureDistrict ?? fromFurnitureDistrict,
    workDistrict,
    destGymDistrict ?? fromGymDistrict
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
  district: DistrictName;
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
    position: { x: 32, y: 85 },
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
    position: { x: 41, y: 59 },
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
    position: { x: 44, y: 88 },
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
    position: { x: 59, y: 64 },
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
    position: { x: 15, y: 16 },
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
    position: { x: 33, y: 16 },
    district: 'Semba',
    color: 'from-gray-400 to-gray-600',
    bonus: { health: 3, happiness: 3, money: -950 },
    bonusDescription: 'Balanced living with unique charm',
  },
];

const UNIVERSITY_HOUSING_STUDENT_RENT = 200; // per season when enrolled and moving to university housing
const UNIVERSITY_HOUSING_ID = 'university-housing';
const LIVE_WITH_PARENTS_ID = 'live-with-parents';

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
  return 'elite fitness';
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

/** Ranges for Basic needs tooltips — thresholds match getHealthMood / getHappinessMood / getEnergyMood / getHungerMood. */
const HEALTH_VITAL_BANDS = [
  { range: '0–19', mood: 'unwell' },
  { range: '20–39', mood: 'bad shape' },
  { range: '40–49', mood: 'below average' },
  { range: '50–59', mood: 'fair shape' },
  { range: '60–69', mood: 'good shape' },
  { range: '70–79', mood: 'great shape' },
  { range: '80–89', mood: 'athletic' },
  { range: '90–100', mood: 'elite fitness' },
] as const;

const HAPPINESS_VITAL_BANDS = [
  { range: '0–19', mood: 'depressed' },
  { range: '20–39', mood: 'unhappy' },
  { range: '40–59', mood: 'moody' },
  { range: '60–69', mood: 'ok' },
  { range: '70–79', mood: 'content' },
  { range: '80–89', mood: 'happy' },
  { range: '90–100', mood: 'elated' },
] as const;

const ENERGY_VITAL_BANDS = [
  { range: '0–9', mood: 'depleted' },
  { range: '10–24', mood: 'exhausted' },
  { range: '25–39', mood: 'tired' },
  { range: '40–59', mood: 'okay' },
  { range: '60–79', mood: 'energized' },
  { range: '80–100', mood: 'full' },
] as const;

const HUNGER_VITAL_BANDS = [
  { range: '0–9', mood: 'starving' },
  { range: '10–24', mood: 'very hungry' },
  { range: '25–39', mood: 'hungry' },
  { range: '40–59', mood: 'peckish' },
  { range: '60–79', mood: 'satisfied' },
  { range: '80–100', mood: 'full' },
] as const;

function VitalScaleTooltip({
  title,
  bands,
  scaleHint,
  value,
  moodLabel,
  children,
}: {
  title: string;
  bands: readonly { range: string; mood: string }[];
  scaleHint: string;
  value: number;
  moodLabel: string;
  children: React.ReactNode;
}) {
  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <div className="min-w-0 cursor-help rounded-md -m-0.5 p-0.5 hover:bg-slate-200/65 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/45">
          {children}
        </div>
      </TooltipTrigger>
      <TooltipContent
        side="left"
        sideOffset={6}
        className={
          'max-w-[min(19rem,92vw)] text-left !rounded-none ' +
          '!bg-[#eef2f8] !text-slate-900 shadow-[4px_4px_0_0_rgba(15,23,42,0.22)] ' +
          '!border-[3px] !border-[#1a2332] px-3 py-2.5 ' +
          '[&>svg]:fill-[#eef2f8] [&>svg]:stroke-[#1a2332]'
        }
      >
        <p className="text-xs font-semibold text-slate-900">{title}</p>
        <p className="text-[10px] text-slate-600 mt-0.5 mb-1.5 leading-snug">{scaleHint}</p>
        <ul className="text-[11px] space-y-0.5 text-slate-800">
          {bands.map((b) => (
            <li key={b.range} className="flex gap-1.5 leading-snug">
              <span className="font-semibold tabular-nums text-slate-900 shrink-0">{b.range}</span>
              <span className="text-slate-500">→</span>
              <span className="text-slate-800">{b.mood}</span>
            </li>
          ))}
        </ul>
        <p className="text-[10px] text-slate-700 mt-2 pt-1.5 border-t border-[#1a2332]/25">
          Yours: <span className="font-semibold tabular-nums text-slate-900">{intStat(value)}</span>
          <span className="text-slate-500"> · </span>
          <span className="text-slate-800">{moodLabel}</span>
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

const OVERTIME_MULTIPLIER = 1.5;
const ON_TIME_PERFORMANCE_RECOVERY = 2; // slight recovery when on time

const PROMOTION_SALARY_MULTIPLIER_PER_TIER = 0.15; // +15% per tier
const MIN_PERFORMANCE_FOR_PROMOTION = 80; // B- or better (80%)
const MIN_DAYS_AT_TIER_FOR_PROMOTION = 14; // 2 weeks

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
    district: 'Centerlight',
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
    district: 'Semba',
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
    district: 'Centerlight',
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
    district: 'Ellum',
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
    district: 'Marina',
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
    district: 'Centerlight',
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
    district: 'Dewmist',
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
    district: 'Ellum',
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
    district: 'Marina',
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
    fitness: 5,
    social: 5,
  });
  const CHARACTER_NAME_MAX = 15;
  const [characterFirstName, setCharacterFirstName] = useState('');
  const [characterLastName, setCharacterLastName] = useState('');
  const characterDisplayName = useMemo(
    () =>
      [characterFirstName.trim(), characterLastName.trim()].filter(Boolean).join(' '),
    [characterFirstName, characterLastName]
  );
  const [characterGender, setCharacterGender] = useState<CharacterGender>('girl');
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterPreset | null>(
    CHARACTER_PRESETS.find((p) => p.id === 'middle') ?? null
  );
  const getDefaultIntroAlloc = useCallback((budget: number) => {
    const b = Math.max(0, Math.min(40, Math.floor(budget)));
    const base = Math.min(10, Math.floor(b / 4));
    let rem = Math.max(0, b - base * 4);

    const alloc = {
      beauty: base,
      smarts: base,
      fitness: base,
      social: base,
    };

    // Distribute remainder (still respecting max 10)
    const keys: Array<keyof typeof alloc> = ['beauty', 'smarts', 'fitness', 'social'];
    for (let i = 0; i < keys.length && rem > 0; i++) {
      const k = keys[i];
      const add = Math.min(10 - alloc[k], rem);
      alloc[k] += add;
      rem -= add;
    }

    return alloc;
  }, []);
  const introPointBudget = useMemo(() => {
    const id = selectedCharacter?.id;
    if (id === 'struggling') return 10;
    if (id === 'middle') return 16;
    if (id === 'privileged') return 24;
    return 20;
  }, [selectedCharacter?.id]);
  const [introStatAlloc, setIntroStatAlloc] = useState<{
    beauty: number;
    smarts: number;
    fitness: number;
    social: number;
  }>(() => {
    return getDefaultIntroAlloc(15);
  });
  useEffect(() => {
    if (!selectedCharacter) return;
    setIntroStatAlloc(getDefaultIntroAlloc(introPointBudget));
  }, [getDefaultIntroAlloc, introPointBudget, selectedCharacter]);
  const introPointsUsed = introStatAlloc.beauty + introStatAlloc.smarts + introStatAlloc.fitness + introStatAlloc.social;
  const introPointsRemaining = Math.max(0, introPointBudget - introPointsUsed);
  const setIntroAllocStat = useCallback(
    (key: 'beauty' | 'smarts' | 'fitness' | 'social', nextRaw: number) => {
      setIntroStatAlloc((prev) => {
        const nextClamped = Math.max(0, Math.min(10, Math.round(nextRaw)));
        const current = prev[key];
        const usedWithoutCurrent = introPointsUsed - current;
        const maxAllowed = Math.min(10, introPointBudget - usedWithoutCurrent);
        const next = Math.min(nextClamped, maxAllowed);
        return { ...prev, [key]: next };
      });
    },
    [introPointBudget, introPointsUsed]
  );
  /** Intro menu mount for enter/exit animations before `startGame` switches stage. */
  const [introMenuVisible, setIntroMenuVisible] = useState(true);
  const introStartExitLockRef = useRef(false);
  /** User tapped Enter after the welcome line — audio unlocked + Merlion/menu fade-in runs. */
  const [introRevealStarted, setIntroRevealStarted] = useState(false);
  /** After first Play on the black screen, the welcome message types out (`useStoryBeatTyping`). */
  const [introWelcomeLineStarted, setIntroWelcomeLineStarted] = useState(false);
  /** Bumps when the welcome line starts (fresh `useStoryBeatTyping` session — like a new school dialogue beat). */
  const [introWelcomeBeatKey, setIntroWelcomeBeatKey] = useState(0);
  const beginIntroWelcomeLineTyping = useCallback(() => {
    setIntroWelcomeBeatKey((k) => k + 1);
    setIntroWelcomeLineStarted(true);
  }, []);
  const [nameMaxHintFirst, setNameMaxHintFirst] = useState(false);
  const [nameMaxHintLast, setNameMaxHintLast] = useState(false);
  const [selectedApartment, setSelectedApartment] = useState<Apartment | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [jobSchedule, setJobSchedule] = useState<JobSchedule>('full-time');
  const [jobTierIndex, setJobTierIndex] = useState(0); // 0 = entry tier; used with job.promotionTiers
  const [jobTierStartedYear, setJobTierStartedYear] = useState(START_YEAR);
  const [jobTierStartedDayOfYear, setJobTierStartedDayOfYear] = useState(1);
  const [jobStartedYear, setJobStartedYear] = useState<number | null>(null); // first day in current job
  const [jobStartedDayOfYear, setJobStartedDayOfYear] = useState<number | null>(null);
  const [jobPerformance, setJobPerformance] = useState(70); // 0–100, C = 70%; start at C, on-time/overtime raises, late drops
  // Tracks when the player first started working this job on this day.
  // Used so "late" penalties apply when you start late (not when you continue a shift after starting early).
  const [workShiftStarted, setWorkShiftStarted] = useState<{
    jobId: string;
    year: number;
    dayOfYear: number;
    hourOfDay: number;
  } | null>(null);
  /** Hours spent on approved meals/snacks at work *before* first clock-in today — subtracted from clock for late check only. */
  const workBreakCreditRef = useRef<{ year: number; dayOfYear: number; hours: number }>({
    year: 0,
    dayOfYear: 0,
    hours: 0,
  });
  /** Leave-work dialog shown at most once per calendar day (same in-game shift); further leaves that day skip the dialog. */
  const leaveWorkDialogShownForDayRef = useRef<{ year: number; dayOfYear: number } | null>(null);
  /** Cumulative hours at 0 hunger and/or 0 energy in the current streak (grace before health penalty). */
  const depletionHoursAccumRef = useRef(0);
  const [rentOverdue, setRentOverdue] = useState(false);
  const [rentOverdueSinceDay, setRentOverdueSinceDay] = useState(0);
  const [lastRentPaidSeasonEndDay, setLastRentPaidSeasonEndDay] = useState<number | null>(null); // 28, 56, 84, or 112
  const [activityCount, setActivityCount] = useState(0);
  const [eventLog, setEventLog] = useState<LogEntry[]>([]);
  const [gamePhase, setGamePhase] = useState<GamePhase>('selecting-home');
  const [educationLevel, setEducationLevel] = useState<EducationLevel>('none');
  const [educationDegree, setEducationDegree] = useState<Degree | null>(null);
  const [educationProgress, setEducationProgress] = useState(0);
  /** First school visit: campus tutorial, then classmates intro event, then done for this playthrough. */
  const [schoolOnboardingPhase, setSchoolOnboardingPhase] = useState<
    'tutorial' | 'meet-classmates' | 'done'
  >('tutorial');
  const [gymMembership, setGymMembership] = useState<GymTier | null>(null);
  const [gymMembershipStartDay, setGymMembershipStartDay] = useState<number | null>(null);

  /** NPC first-meet story overlay (story card → Next → dialogue card). */
  const [npcIntroOpen, setNpcIntroOpen] = useState(false);
  const [npcIntroNpcId, setNpcIntroNpcId] = useState<NpcId | null>(null);
  const [npcIntroSubStep, setNpcIntroSubStep] = useState(0);
  const npcIntroCommitLockRef = useRef(false);

  /** Seasonal full-moon moment at Dewmist Park (story card → Next → dialogue card). */
  const [fullMoonEventOpen, setFullMoonEventOpen] = useState(false);
  const [fullMoonSubStep, setFullMoonSubStep] = useState(0);
  const [fullMoonEventKey, setFullMoonEventKey] = useState<string | null>(null);

  const [groceryBuckets, setGroceryBuckets] = useState<GroceryBucketsState>(EMPTY_GROCERY_BUCKETS);
  /** Packed meals waiting at home (separate from counter overflow — only these can be stashed). */
  const [togoHome, setTogoHome] = useState<{ regular: number; lux: number }>({ regular: 0, lux: 0 });
  const [togoFreshHome, setTogoFreshHome] = useState<{ regular: number; lux: number }>({
    regular: 100,
    lux: 100,
  });
  const [togoCarried, setTogoCarried] = useState<{ regular: number; lux: number }>({ regular: 0, lux: 0 });
  const [togoFreshCarried, setTogoFreshCarried] = useState<{ regular: number; lux: number }>({
    regular: 100,
    lux: 100,
  });
  const groceries = useMemo(
    () => ({
      regular: groceryBuckets.fridge.regular + groceryBuckets.counter.regular,
      lux: groceryBuckets.fridge.lux + groceryBuckets.counter.lux,
    }),
    [groceryBuckets]
  );

  /** Latest pantry buckets for advanceTime spoilage (avoids stale closure after buying groceries then traveling). */
  const groceryBucketsRef = useRef(groceryBuckets);
  groceryBucketsRef.current = groceryBuckets;

  const [skincareDoses, setSkincareDoses] = useState(() => emptySkincareDoses());
  const skincareDosesRef = useRef(skincareDoses);
  skincareDosesRef.current = skincareDoses;

  const [lastHaircutYear, setLastHaircutYear] = useState<number | null>(null);
  const [lastHaircutDayOfYear, setLastHaircutDayOfYear] = useState<number | null>(null);

  const haircutSalon = useMemo(() => {
    const cd = haircutCooldownStatus(
      lastHaircutYear,
      lastHaircutDayOfYear,
      stats.year,
      stats.dayOfYear,
      START_YEAR,
      DAYS_PER_YEAR
    );
    return {
      canCut: cd.canCut,
      daysRemaining: cd.daysRemaining,
      nextDateLabel: formatDate(cd.nextYear, cd.nextDayOfYear),
    };
  }, [lastHaircutYear, lastHaircutDayOfYear, stats.year, stats.dayOfYear]);

  const [npcInteractions, setNpcInteractions] = useState(emptyNpcInteractions);
  const npcInteractionsRef = useRef(npcInteractions);
  npcInteractionsRef.current = npcInteractions;
  const [npcRelationshipLastBumpDay, setNpcRelationshipLastBumpDay] = useState(
    emptyNpcRelationshipLastBumpDay
  );
  const npcRelationshipLastBumpDayRef = useRef(npcRelationshipLastBumpDay);
  npcRelationshipLastBumpDayRef.current = npcRelationshipLastBumpDay;
  const [datingPartnerId, setDatingPartnerId] = useState<NpcId | null>(null);

  const togoHomeRef = useRef(togoHome);
  togoHomeRef.current = togoHome;
  const togoFreshHomeRef = useRef(togoFreshHome);
  togoFreshHomeRef.current = togoFreshHome;
  const togoCarriedRef = useRef(togoCarried);
  togoCarriedRef.current = togoCarried;
  const togoFreshCarriedRef = useRef(togoFreshCarried);
  togoFreshCarriedRef.current = togoFreshCarried;

  /** Fridge capacity for spoilage split; Infinity when food doesn't spoil (parents). */
  const getEffectiveFridgeCap = (): number => {
    if (selectedApartment?.id === LIVE_WITH_PARENTS_ID) return Number.POSITIVE_INFINITY;
    const c = getFridgeMealCapacity(homeFurniture.fridgeId);
    return c ?? 0;
  };
  const [groceryFreshness, setGroceryFreshness] = useState<{ regular: number; lux: number }>({
    regular: 100,
    lux: 100,
  });
  const spoilHoursBankRef = useRef(0);
  const [backpackId, setBackpackId] = useState<BackpackId | null>(null);
  const [snackCounts, setSnackCounts] = useState<Record<SnackId, number>>(() => ({ ...EMPTY_SNACK_COUNTS }));
  const [homeFurniture, setHomeFurniture] = useState<HomeFurnitureState>(EMPTY_HOME_FURNITURE);
  const [funItems, setFunItems] = useState<string[]>([]); // item ids from daily rewards
  const [diplomas, setDiplomas] = useState<Degree[]>([]);
  const [dailyState, setDailyState] = useState<DailyState>(() => getDailyState());
  const [dailyActivitiesOpen, setDailyActivitiesOpen] = useState(false);
  const [devCheatsOpen, setDevCheatsOpen] = useState(false);
  const [calendarOverlayOpen, setCalendarOverlayOpen] = useState(false);
  const [mapOverlayOpen, setMapOverlayOpen] = useState(false);
  const [playerHubCollapsed, setPlayerHubCollapsed] = useState(false);
  const [pendingGoHomeAnimation, setPendingGoHomeAnimation] = useState(false);
  const [pendingGoToSchoolAnimation, setPendingGoToSchoolAnimation] = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [furnitureSellOpen, setFurnitureSellOpen] = useState(false);
  const [furnitureOfferOpen, setFurnitureOfferOpen] = useState(false);
  const [furnitureSellOffer, setFurnitureSellOffer] = useState<{
    itemId: string;
    itemName: string;
    icon: string;
    price: number;
    pctLabel: number;
    originalCost: number;
  } | null>(null);
  /** When true, closing the buyer offer dialog was caused by accepting — skip "turned down" log. */
  const furnitureOfferClosedByAcceptRef = useRef(false);
  /** Dedup full-moon park moment per in-game calendar day (year–dayOfYear). */
  const fullMoonDewmistParkWitnessRef = useRef<string | null>(null);
  const prevSeasonIndexRef = useRef<number | null>(null);
  const [seasonBanner, setSeasonBanner] = useState<ReturnType<typeof getSeasonName> | null>(null);
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [eventLogOpen, setEventLogOpen] = useState(false);
  const [playerSkillsOpen, setPlayerSkillsOpen] = useState(false);
  const [showAlreadyPaidRentDialog, setShowAlreadyPaidRentDialog] = useState(false);
  const [workRiskDialog, setWorkRiskDialog] = useState<{
    requestedHours: number;
    overtimeHours: number;
    intensity: 'slack' | 'normal' | 'hard';
    energyCost: number;
    passOutChance: number;
  } | null>(null);
  const [pendingMoveApartment, setPendingMoveApartment] = useState<Apartment | null>(null);
  const [parkDistrict, setParkDistrict] = useState<DistrictName | null>('Ellum');
  const [groceryDistrict, setGroceryDistrict] = useState<DistrictName | null>('Centerlight');
  const [furnitureDistrict, setFurnitureDistrict] = useState<DistrictName | null>('Centerlight');
  /** Which district's gym building you are visiting (each offers one tier). */
  const [gymDistrict, setGymDistrict] = useState<'Dewmist' | 'Semba' | 'Marina'>('Semba');
  const [pendingLeaveWork, setPendingLeaveWork] = useState<{
    target: GamePhase;
    opts?: {
      parkDistrict?: DistrictName;
      groceryDistrict?: DistrictName;
      furnitureDistrict?: DistrictName;
      gymDistrict?: 'Dewmist' | 'Semba' | 'Marina';
    };
  } | null>(null);
  const [devForm, setDevForm] = useState({
    health: '', happiness: '', energy: '', hunger: '', money: '', beauty: '', smarts: '', fitness: '', social: '',
    year: '', dayOfYear: '', hourOfDay: '',
    jobPerformance: '', jobTierIndex: '',
  });

  const [devCheatsPortalTarget, setDevCheatsPortalTarget] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => {
    if (stage !== 'playing') {
      setDevCheatsPortalTarget(null);
      return;
    }
    setDevCheatsPortalTarget(document.getElementById('life-sim-dev-cheats-anchor'));
  }, [stage]);

  const loadDevFormFromStats = () => {
    setDevForm({
      health: fmt2(stats.health),
      happiness: fmt2(stats.happiness),
      energy: fmt2(stats.energy),
      hunger: fmt2(stats.hunger),
      money: fmt2(stats.money),
      beauty: fmt2(stats.beauty),
      smarts: fmt2(stats.smarts),
      fitness: fmt2(stats.fitness),
      social: fmt2(stats.social),
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
      money: Math.max(0, parseFloat(devForm.money.replace(/,/g, '')) || 0),
      beauty: round2(num(devForm.beauty, 0, 10)),
      smarts: round2(num(devForm.smarts, 0, 10)),
      fitness: round2(num(devForm.fitness, 0, 10)),
      social: round2(num(devForm.social, 0, 10)),
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
      beauty: introStatAlloc.beauty,
      smarts: introStatAlloc.smarts,
      fitness: introStatAlloc.fitness,
      social: introStatAlloc.social,
    });
    setActivityCount(0);
    setEventLog([]);
    fullMoonDewmistParkWitnessRef.current = null;
    setSelectedApartment(null);
    setSelectedJob(null);
    setGymMembership(null);
    setGymMembershipStartDay(null);
    setGroceryBuckets(EMPTY_GROCERY_BUCKETS);
    setGroceryFreshness({ regular: 100, lux: 100 });
    setSkincareDoses(emptySkincareDoses());
    setLastHaircutYear(null);
    setLastHaircutDayOfYear(null);
    setTogoHome({ regular: 0, lux: 0 });
    setTogoFreshHome({ regular: 100, lux: 100 });
    setTogoCarried({ regular: 0, lux: 0 });
    setTogoFreshCarried({ regular: 100, lux: 100 });
    spoilHoursBankRef.current = 0;
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
    setNpcInteractions(emptyNpcInteractions());
    setNpcRelationshipLastBumpDay(emptyNpcRelationshipLastBumpDay());
    setDatingPartnerId(null);
    setGamePhase('selecting-home');
    prevSeasonIndexRef.current = null;
    setSeasonBanner(null);
    setWorkShiftStarted(null);
    workBreakCreditRef.current = { year: 0, dayOfYear: 0, hours: 0 };
    setPendingLeaveWork(null);
    leaveWorkDialogShownForDayRef.current = null;
    setSchoolOnboardingPhase('tutorial');
  };

  useEffect(() => {
    if (stage === 'intro') {
      setIntroMenuVisible(true);
      setIntroRevealStarted(false);
      setIntroWelcomeLineStarted(false);
      introStartExitLockRef.current = false;
      setNameMaxHintFirst(false);
      setNameMaxHintLast(false);
    }
  }, [stage]);

  useEffect(() => {
    if (DAILY_ACTIVITIES_ENABLED && stage === 'playing') {
      const next = getDailyState();
      setDailyState(next);
      const hasIncomplete = next.activities.some((a) => !next.completedIds.has(a.id));
      if (hasIncomplete) setDailyActivitiesOpen(true);
    }
  }, [stage]);

  useEffect(() => {
    const idx = getSeasonIndex(stats.dayOfYear);
    if (stage !== 'playing') {
      prevSeasonIndexRef.current = idx;
      return;
    }
    if (prevSeasonIndexRef.current === null) {
      prevSeasonIndexRef.current = idx;
      return;
    }
    if (prevSeasonIndexRef.current !== idx) {
      prevSeasonIndexRef.current = idx;
      setSeasonBanner(getSeasonName(stats.dayOfYear));
      const id = window.setTimeout(() => setSeasonBanner(null), SEASON_CELEBRATE_MS);
      return () => clearTimeout(id);
    }
  }, [stats.dayOfYear, stage]);

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
      const key = isLux ? ('lux' as const) : ('regular' as const);
      setGroceryBuckets((prev) => {
        const newCounter = { ...prev.counter, [key]: prev.counter[key] + meals };
        return rebalanceGroceriesToFridge(prev.fridge, newCounter, getEffectiveFridgeCap());
      });
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
    if (selectedApartment?.id === apartment.id) return;
    const isEnrolled = educationLevel === 'in-progress';
    const isMovingToUniversityHousing = apartment.id === UNIVERSITY_HOUSING_ID;
    const fullSeasonRent =
      isMovingToUniversityHousing && isEnrolled
        ? UNIVERSITY_HOUSING_STUDENT_RENT
        : apartment.rent;

    // Prorate rent by days left in the current week.
    // Apartment.rent is stored as "per season (28 days)" so we divide by 4 for weekly rent.
    const WEEK_END_DAYS = [7, 14, 21, 28, 35, 42, 49, 56, 63, 70, 77, 84, 91, 98, 105, 112];
    const weekEnd = WEEK_END_DAYS.find((d) => d >= stats.dayOfYear) ?? 112;
    const daysLeftInWeek = weekEnd - stats.dayOfYear + 1;
    const weeklyRent = fullSeasonRent > 0 ? fullSeasonRent / 4 : 0;
    const rentToCharge = weeklyRent > 0 ? Math.round((daysLeftInWeek / 7) * weeklyRent) : 0;

    if (rentToCharge > 0 && stats.money < rentToCharge) return;
    const moneyAfterRent = rentToCharge > 0 ? Math.max(0, stats.money - rentToCharge) : stats.money;
    const newStats: GameStats = {
      ...stats,
      health: round2(Math.max(0, Math.min(100, stats.health + (apartment.bonus.health || 0)))),
      happiness: round2(Math.max(0, Math.min(100, stats.happiness + (apartment.bonus.happiness || 0)))),
      money: moneyAfterRent,
    };

    setStats(newStats);
    const prevAptId = selectedApartment?.id;
    setSelectedApartment(apartment);

    if (apartment.id === LIVE_WITH_PARENTS_ID) {
      setHomeFurniture(LIVE_WITH_PARENTS_DEFAULT_FURNITURE);
      setGroceryBuckets((prev) => {
        const merged = rebalanceGroceriesToFridge(
          prev.fridge,
          prev.counter,
          Number.POSITIVE_INFINITY
        );
        const cap = getFridgeMealCapacity(LIVE_WITH_PARENTS_DEFAULT_FURNITURE.fridgeId) ?? 8;
        const next = topUpParentsFridge(merged, cap);
        groceryBucketsRef.current = next;
        return next;
      });
    } else if (prevAptId === LIVE_WITH_PARENTS_ID) {
      setHomeFurniture(EMPTY_HOME_FURNITURE);
      setGroceryBuckets((prev) => {
        const merged = rebalanceGroceriesToFridge(prev.fridge, prev.counter, 0);
        groceryBucketsRef.current = merged;
        return merged;
      });
    }

    if (rentToCharge > 0) {
      const firstWeekEnd = WEEK_END_DAYS.find((d) => d >= stats.dayOfYear) ?? 7;
      setLastRentPaidSeasonEndDay(
        stats.dayOfYear <= 7 ? Math.max(0, firstWeekEnd - 7) : firstWeekEnd
      );
    } else {
      setLastRentPaidSeasonEndDay(null);
    }

    const isProrated = daysLeftInWeek < 7;
    const rentNote =
      rentToCharge > 0
        ? isMovingToUniversityHousing && isEnrolled
          ? ` Student rate: ${isProrated ? `prorated rent ($${rentToCharge}) for ${daysLeftInWeek} days left` : 'first week\'s rent ($${rentToCharge})'} paid. Future rent is due each week (phone reminds you a few days ahead).`
          : ` ${isProrated ? `Prorated rent ($${rentToCharge}) for ${daysLeftInWeek} days left` : `First week\'s rent ($${rentToCharge})`} paid. Future rent is due each week (phone reminds you a few days ahead).`
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

  const quitJob = () => {
    if (!selectedJob) return;
    const job = selectedJob;
    const title = getCurrentJobTitle(job);
    setSelectedJob(null);
    setJobTierIndex(0);
    setJobStartedYear(null);
    setJobStartedDayOfYear(null);
    setJobTierStartedYear(stats.year);
    setJobTierStartedDayOfYear(stats.dayOfYear);
    setJobPerformance(70);
    setWorkShiftStarted(null);
    workBreakCreditRef.current = { year: 0, dayOfYear: 0, hours: 0 };
    leaveWorkDialogShownForDayRef.current = null;
    setPendingLeaveWork(null);
    setJobSchedule('full-time');
    setEventLog((prev) => [
      {
        id: Date.now(),
        text: `You quit your job as ${title} (${job.name}). You are unemployed until you accept a new offer.`,
        timestamp: formatTimestamp(stats.year, stats.dayOfYear, stats.hourOfDay),
        effects: {},
      },
      ...prev,
    ]);
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
    // Allow coming in up to `HOURS_EARLY_WORK_START` hours early.
    // Example: start at 8 with early=1 => can work starting at 7.
    return hour >= job.workStartHour - HOURS_EARLY_WORK_START && hour < endHour;
  };

  const getHoursAvailableToWork = (job: Job, hour: number): number => {
    if (job.workStartHour === 0 && job.workEndHourFull === 24) return workHoursPerShift();
    const endHour = getWorkEndHour(job);
    return Math.min(workHoursPerShift(), Math.max(0, endHour - hour));
  };

  const isLateForWork = (job: Job, hour: number): boolean => {
    if (job.workStartHour === 0 && job.workEndHourFull === 24) return false; // freelancer
    return hour > job.workStartHour + LATE_WORK_GRACE_HOURS;
  };

  const canWorkNow = (): boolean => {
    if (!selectedJob) return false;
    if (!hasWaitedFirstDayForJob()) return false;
    return isDuringWorkHours(selectedJob, stats.hourOfDay) && getHoursAvailableToWork(selectedJob, stats.hourOfDay) > 0;
  };

  // "Go to work" button should be enabled only if the player can still work
  // after traveling to your job’s workplace district.
  const canGoToWorkNow = (): boolean => {
    if (!selectedJob) return false;
    if (!hasWaitedFirstDayForJob()) return false;

    const minsToJobCenter = getTravelMinutes(
      gamePhase,
      'work',
      selectedApartment?.district,
      parkDistrict,
      groceryDistrict,
      furnitureDistrict,
      undefined,
      undefined,
      undefined,
      selectedJob.district,
      gymDistrict,
      undefined
    );
    const arrivalHour = stats.hourOfDay + minsToJobCenter / 60;
    return isDuringWorkHours(selectedJob, arrivalHour) && getHoursAvailableToWork(selectedJob, arrivalHour) > 0;
  };

  const getGoToWorkDisabledReason = (): string => {
    if (!selectedJob) return 'No job selected.';
    if (!hasWaitedFirstDayForJob()) return 'Come back tomorrow for your first day of work!';
    if (!isWeekday()) return 'It\'s the weekend — work Mon–Fri only';
    return 'Outside work hours — come back during your shift';
  };

  const canWorkOvertimeNow = (): boolean => {
    if (!selectedJob || selectedJob.workStartHour === 0) return false;
    if (!hasWaitedFirstDayForJob()) return false;
    if (!isWeekday()) return false; // Mon–Fri only
    const endHour = getWorkEndHour(selectedJob);
    return stats.hourOfDay >= endHour && stats.hourOfDay < endHour + 1;
  };

  const passOneHour = () => {
    advanceTime({ hunger: -HUNGER_PASS_ONE_HOUR }, '1 hour passed.', 1);
  };

  /** Meal/snack time at work before the first work click of the day — does not count toward “late” at clock-in. */
  const bumpWorkBreakCreditIfBeforeFirstShift = (mealHours: number) => {
    if (mealHours <= 0 || gamePhase !== 'work') return;
    const y = stats.year;
    const d = stats.dayOfYear;
    const started = workShiftStarted;
    const alreadyClockedIn =
      started != null &&
      started.year === y &&
      started.dayOfYear === d &&
      selectedJob != null &&
      started.jobId === selectedJob.id;
    if (alreadyClockedIn) return;
    const cur = workBreakCreditRef.current;
    if (cur.year !== y || cur.dayOfYear !== d) {
      workBreakCreditRef.current = { year: y, dayOfYear: d, hours: mealHours };
    } else {
      workBreakCreditRef.current = { year: y, dayOfYear: d, hours: cur.hours + mealHours };
    }
  };

  type WorkIntensity = 'slack' | 'normal' | 'hard';
  const WORK_INTENSITY = {
    slack: { perfDelta: 0.25, happinessMultiplier: 0.5, energyCost: 10 },
    normal: { perfDelta: 0.5, happinessMultiplier: 1, energyCost: 25 },
    hard: { perfDelta: 0.75, happinessMultiplier: 1.5, energyCost: 40 },
  } satisfies Record<WorkIntensity, { perfDelta: number; happinessMultiplier: number; energyCost: number }>;

  const PASS_OUT_SLEEP_HOURS = 8;

  const workShift = (
    overtimeHours: number = 0,
    intensity: WorkIntensity = 'normal',
    requestedHours: number = 4,
    opts?: { skipRiskConfirm?: boolean }
  ) => {
    if (!selectedJob) return;

    const inOvertimeWindow = overtimeHours > 0 && canWorkOvertimeNow();
    const inRegularHours = isDuringWorkHours(selectedJob, stats.hourOfDay);

    if (!inOvertimeWindow && !inRegularHours) return;

    const endHour = getWorkEndHour(selectedJob);
    const overtimeWindowEndHour = endHour + 1;

    let totalHours: number;
    let actualOvertimeHours = 0;
    let isOT = false;
    let baseHoursForPay = 0;

    if (inOvertimeWindow) {
      actualOvertimeHours = Math.min(
        overtimeHours,
        Math.max(0, overtimeWindowEndHour - stats.hourOfDay)
      );
      if (actualOvertimeHours <= 0) return;
      totalHours = actualOvertimeHours;
      isOT = true;
    } else {
      const available = getHoursAvailableToWork(selectedJob, stats.hourOfDay);
      if (available <= 0) return;
      const hoursToWork = Math.min(Math.max(1, requestedHours), available);
      totalHours = hoursToWork;
      baseHoursForPay = hoursToWork;
    }

    const expectedShiftHours = inOvertimeWindow
      ? Math.max(actualOvertimeHours, 0.01)
      : workHoursPerShift();
    let energyCost =
      WORK_INTENSITY[intensity].energyCost * (totalHours / expectedShiftHours) * WORK_ENERGY_MULTIPLIER;
    if (isOT) energyCost /= 4;

    if (energyCost > stats.energy && !opts?.skipRiskConfirm) {
      const passOutChance = Math.min(0.9, totalHours / Math.max(stats.energy, 0.01));
      setWorkRiskDialog({
        requestedHours: inOvertimeWindow ? requestedHours : Math.min(Math.max(1, requestedHours), getHoursAvailableToWork(selectedJob, stats.hourOfDay)),
        overtimeHours: inOvertimeWindow ? overtimeHours : 0,
        intensity,
        energyCost,
        passOutChance,
      });
      return;
    }

    // Late penalty once per day: first work block only, not every continued block.
    let late = false;
    if (!inOvertimeWindow) {
      const sameDayAndJob =
        workShiftStarted != null &&
        workShiftStarted.jobId === selectedJob.id &&
        workShiftStarted.year === stats.year &&
        workShiftStarted.dayOfYear === stats.dayOfYear;

      if (!sameDayAndJob) {
        const credit = workBreakCreditRef.current;
        const creditHours =
          credit.year === stats.year && credit.dayOfYear === stats.dayOfYear ? credit.hours : 0;
        const shiftStartHour = stats.hourOfDay - creditHours;
        late = isLateForWork(selectedJob, shiftStartHour);
        setWorkShiftStarted({
          jobId: selectedJob.id,
          year: stats.year,
          dayOfYear: stats.dayOfYear,
          hourOfDay: stats.hourOfDay,
        });
        if (creditHours > 0) {
          workBreakCreditRef.current = { year: stats.year, dayOfYear: stats.dayOfYear, hours: 0 };
        }
      }
    }
    const { perfDelta, happinessMultiplier } = WORK_INTENSITY[intensity];
    const newPerformance = Math.max(
      0,
      Math.min(100, jobPerformance + (late ? -LATE_WORK_PERFORMANCE_PENALTY : perfDelta))
    );
    setJobPerformance(newPerformance);

    const healthDelta = ((selectedJob.effect.health ?? 0) * totalHours) / (8 * DAYS_PER_SEASON);
    const baseHappinessDelta = ((selectedJob.effect.happiness ?? 0) * totalHours) / (8 * DAYS_PER_SEASON);
    const happinessDelta = baseHappinessDelta * happinessMultiplier;

    const hrRate = salaryPerHour(selectedJob);
    const basePay = hrRate * baseHoursForPay;
    const otPay = isOT ? hrRate * totalHours * OVERTIME_MULTIPLIER : 0;
    const actualPay = Math.round((basePay + otPay) * 100) / 100;

    const energyAfterWork = Math.max(0, stats.energy - energyCost);
    let passOut = false;
    if (energyAfterWork <= 0.001) {
      const p =
        energyCost > stats.energy
          ? Math.min(0.9, totalHours / Math.max(stats.energy, 0.01))
          : 0.9;
      if (Math.random() < p) passOut = true;
    }

    const jobTitle = getCurrentJobTitle(selectedJob);
    const intensityLabel = intensity === 'slack' ? 'Slack' : intensity === 'hard' ? 'Hard' : 'Normal';
    let msg = `You worked ${totalHours} hour${totalHours > 1 ? 's' : ''} as ${jobTitle} (${intensityLabel}). `;
    if (isOT) msg += '(Overtime) ';
    if (late) msg += '(Late — job performance dropped.) ';
    msg += `Earned $${formatMoney(actualPay)}.`;

    const hungerCost = -HUNGER_PER_WORK_HOUR * totalHours;

    let hoursPassed = totalHours;
    let energyEffect = -energyCost;

    if (passOut) {
      const bedBonus = getSleepEnergyBonusPerHour(homeFurniture);
      const perHour = 10 + bedBonus;
      const eAfterWork = Math.max(0, stats.energy - energyCost);
      const sleepGain = Math.min(PASS_OUT_SLEEP_HOURS * perHour, 100 - eAfterWork);
      energyEffect = eAfterWork + sleepGain - stats.energy;
      hoursPassed = totalHours + PASS_OUT_SLEEP_HOURS;
      msg += ` You passed out from exhaustion. You wake up ${PASS_OUT_SLEEP_HOURS} hours later at home.`;
    }

    advanceTime(
      { health: healthDelta, happiness: happinessDelta, energy: energyEffect, hunger: hungerCost, money: actualPay },
      msg,
      hoursPassed
    );
    if (passOut) setGamePhase('home');
  };

  const formatTimestamp = (year: number, dayOfYear: number, hourOfDay?: number) => {
    const lifeStage = getLifeStage(year, dayOfYear, stats.birthYear);
    const time = hourOfDay !== undefined ? ` ${formatTime(hourOfDay)}` : '';
    return `${formatDate(year, dayOfYear)}${time} · ${lifeStage}`;
  };

  const advanceTime = (
    effect: {
      health?: number;
      happiness?: number;
      energy?: number;
      hunger?: number;
      money?: number;
      beauty?: number;
      smarts?: number;
      fitness?: number;
      social?: number;
    },
    resultText: string,
    hoursPassed: number,
    overrideRentPerSeason?: number,
    /** Post-action food state when setState runs in the same handler (avoids stale closure overwriting counters / packed to-go). */
    spoilageOverrides?: SpoilageOverrides
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

    let workSkincare = { ...skincareDosesRef.current };
    let skincareBeautyAccumulator = 0;

    const spoilBuckets = spoilageOverrides?.groceryBuckets ?? groceryBucketsRef.current;
    let groceryR = spoilBuckets.counter.regular;
    let groceryL = spoilBuckets.counter.lux;
    let freshR = groceryFreshness.regular;
    let freshL = groceryFreshness.lux;
    let thR = spoilageOverrides?.togoHome?.regular ?? togoHomeRef.current.regular;
    let thL = spoilageOverrides?.togoHome?.lux ?? togoHomeRef.current.lux;
    let tcR = spoilageOverrides?.togoCarried?.regular ?? togoCarriedRef.current.regular;
    let tcL = spoilageOverrides?.togoCarried?.lux ?? togoCarriedRef.current.lux;
    let tfhR = spoilageOverrides?.togoFreshHome?.regular ?? togoFreshHomeRef.current.regular;
    let tfhL = spoilageOverrides?.togoFreshHome?.lux ?? togoFreshHomeRef.current.lux;
    let tfcR = spoilageOverrides?.togoFreshCarried?.regular ?? togoFreshCarriedRef.current.regular;
    let tfcL = spoilageOverrides?.togoFreshCarried?.lux ?? togoFreshCarriedRef.current.lux;

    const spoilOverridesApply =
      spoilageOverrides != null &&
      (spoilageOverrides.groceryBuckets != null ||
        spoilageOverrides.togoHome != null ||
        spoilageOverrides.togoFreshHome != null ||
        spoilageOverrides.togoCarried != null ||
        spoilageOverrides.togoFreshCarried != null);
    let spoilDecayEvents = 0;
    if (selectedApartment?.id !== LIVE_WITH_PARENTS_ID) {
      const freshnessFactor = Math.pow(0.5, Math.max(0, hoursPassed) / 12);
      if (groceryR > 0) freshR = Math.max(0, Math.floor(freshR * freshnessFactor));
      else freshR = 100;
      if (groceryL > 0) freshL = Math.max(0, Math.floor(freshL * freshnessFactor));
      else freshL = 100;
      if (thR > 0) tfhR = Math.max(0, Math.floor(tfhR * freshnessFactor));
      else tfhR = 100;
      if (thL > 0) tfhL = Math.max(0, Math.floor(tfhL * freshnessFactor));
      else tfhL = 100;
      if (tcR > 0) tfcR = Math.max(0, Math.floor(tfcR * freshnessFactor));
      else tfcR = 100;
      if (tcL > 0) tfcL = Math.max(0, Math.floor(tfcL * freshnessFactor));
      else tfcL = 100;
      spoilHoursBankRef.current += hoursPassed;
      while (
        spoilHoursBankRef.current >= 12 &&
        (groceryR > 0 || groceryL > 0 || thR > 0 || thL > 0 || tcR > 0 || tcL > 0)
      ) {
        spoilHoursBankRef.current -= 12;
        groceryR = Math.floor(groceryR * 0.5);
        groceryL = Math.floor(groceryL * 0.5);
        freshR = Math.max(0, Math.floor(freshR * 0.5));
        freshL = Math.max(0, Math.floor(freshL * 0.5));
        thR = Math.floor(thR * 0.5);
        thL = Math.floor(thL * 0.5);
        tcR = Math.floor(tcR * 0.5);
        tcL = Math.floor(tcL * 0.5);
        tfhR = Math.max(0, Math.floor(tfhR * 0.5));
        tfhL = Math.max(0, Math.floor(tfhL * 0.5));
        tfcR = Math.max(0, Math.floor(tfcR * 0.5));
        tfcL = Math.max(0, Math.floor(tfcL * 0.5));
        spoilDecayEvents += 1;
      }
    } else {
      // Parents' pantry / home to-go do not spoil; backpack packed to-go still does (same rules as counter).
      if (tcR <= 0 && tcL <= 0) {
        spoilHoursBankRef.current = 0;
      } else {
        const freshnessFactor = Math.pow(0.5, Math.max(0, hoursPassed) / 12);
        if (tcR > 0) tfcR = Math.max(0, Math.floor(tfcR * freshnessFactor));
        else tfcR = 100;
        if (tcL > 0) tfcL = Math.max(0, Math.floor(tfcL * freshnessFactor));
        else tfcL = 100;
        spoilHoursBankRef.current += hoursPassed;
        while (spoilHoursBankRef.current >= 12 && (tcR > 0 || tcL > 0)) {
          spoilHoursBankRef.current -= 12;
          tcR = Math.floor(tcR * 0.5);
          tcL = Math.floor(tcL * 0.5);
          tfcR = Math.max(0, Math.floor(tfcR * 0.5));
          tfcL = Math.max(0, Math.floor(tfcL * 0.5));
          spoilDecayEvents += 1;
        }
      }
    }
    freshR = clampFreshnessPct(freshR);
    freshL = clampFreshnessPct(freshL);
    tfhR = clampFreshnessPct(tfhR);
    tfhL = clampFreshnessPct(tfhL);
    tfcR = clampFreshnessPct(tfcR);
    tfcL = clampFreshnessPct(tfcL);
    const freshnessChanged =
      freshR !== groceryFreshness.regular ||
      freshL !== groceryFreshness.lux ||
      tfhR !== togoFreshHome.regular ||
      tfhL !== togoFreshHome.lux ||
      tfcR !== togoFreshCarried.regular ||
      tfcL !== togoFreshCarried.lux;

    let furnitureHappinessDelta = 0;
    let furnitureHungerDelta = 0;

    let healthDeltaFromDaily = 0;
    let healthDeltaFromWeekly = 0;
    let daysCrossed = 0;
    while (newHourOfDay >= 24) {
      daysCrossed += 1;
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
      const justCrossedWeekStart = (newDayOfYear - 1) % 7 === 0;
      if (lifeStageForDay === 'elderly') {
        healthDeltaFromDaily -= 8;
      }
      if (justCrossedWeekStart) {
        if (lifeStageForDay === 'adult') {
          healthDeltaFromWeekly -= HEALTH_DECAY_WEEKLY_ADULT;
        } else if (lifeStageForDay === 'young adult') {
          healthDeltaFromWeekly -= HEALTH_DECAY_WEEKLY_YOUNG_ADULT;
        }
      }

      const weekEndDays = [7, 14, 21, 28, 35, 42, 49, 56, 63, 70, 77, 84, 91, 98, 105, 112];
      const justCrossedWeekEnd = weekEndDays.includes(newDayOfYear - 1) || newDayOfYear === 1;
      const weekJustEnded = newDayOfYear === 1 ? 112 : newDayOfYear - 1;
      const baseRent = overrideRentPerSeason ?? (newSelectedApartment ? newSelectedApartment.rent : 0);
      const rentPerSeason =
        newSelectedApartment?.id === UNIVERSITY_HOUSING_ID && educationLevel === 'in-progress'
          ? UNIVERSITY_HOUSING_STUDENT_RENT
          : baseRent;
      const rentPerWeek = Math.round((rentPerSeason / 4) * 100) / 100;
      const alreadyPaidForThisWeek =
        newLastRentPaidSeasonEndDay != null && newLastRentPaidSeasonEndDay >= weekJustEnded;

      if (justCrossedWeekEnd && rentPerWeek > 0 && !newRentOverdue && !alreadyPaidForThisWeek) {
        if (stats.money + moneyDelta >= rentPerWeek) {
          moneyDelta -= rentPerWeek;
          newLastRentPaidSeasonEndDay = weekJustEnded;
          setEventLog((prev) => [
            {
              id: Date.now() + 400,
              text: `Rent paid: $${rentPerWeek.toLocaleString()} for the week.`,
              timestamp: formatTimestamp(newYear, newDayOfYear, newHourOfDay),
              effects: { money: -rentPerWeek },
            },
            ...prev,
          ]);
        } else {
          newRentOverdue = true;
          newRentOverdueSinceDay = newDayOfYear;
        }
      }

      const seasonEndDays = [28, 56, 84, 112];

      // Tuition reminder: 3 days before season end if enrolled in a degree.
      if (
        educationLevel === 'in-progress' &&
        seasonEndDays.some((end) => newDayOfYear === end - 3)
      ) {
        setEventLog((prev) => [
          {
            id: Date.now() + 300,
            text: '📱 Tuition reminder: In 3 days the next season starts — you must pay tuition on your phone for that season or you cannot study. Campus is only open the first two weeks of each season.',
            timestamp: formatTimestamp(newYear, newDayOfYear, newHourOfDay),
            effects: {},
          },
          ...prev,
        ]);
      }

      // First calendar day of each season: enrolled students owe tuition for the new season before studying.
      const seasonStartDays = [1, 29, 57, 85];
      if (
        educationLevel === 'in-progress' &&
        daysCrossed > 0 &&
        seasonStartDays.includes(newDayOfYear)
      ) {
        setEventLog((prev) => [
          {
            id: Date.now() + 302,
            text: '📱 New season: pay tuition on your phone for this season before you study. Without payment you cannot progress your degree. School visits and study are only allowed in the first two weeks of each season.',
            timestamp: formatTimestamp(newYear, newDayOfYear, newHourOfDay),
            effects: {},
          },
          ...prev,
        ]);
      }

      // Rent reminder: 3 days before week end when rent > 0 and not living with parents.
      const rentPerSeasonForReminder =
        newSelectedApartment?.id === UNIVERSITY_HOUSING_ID && educationLevel === 'in-progress'
          ? UNIVERSITY_HOUSING_STUDENT_RENT
          : newSelectedApartment?.rent ?? 0;
      const rentPerWeekForReminder = Math.round((rentPerSeasonForReminder / 4) * 100) / 100;
      if (
        rentPerWeekForReminder > 0 &&
        weekEndDays.some((end) => newDayOfYear === end - RENT_GRACE_DAYS)
      ) {
        setEventLog((prev) => [
          {
            id: Date.now() + 301,
            text: `📱 Rent reminder: In ${RENT_GRACE_DAYS} days you will owe $${rentPerWeekForReminder.toLocaleString()} rent for the next week. Open your phone to pay now.`,
            timestamp: formatTimestamp(newYear, newDayOfYear, newHourOfDay),
            effects: {},
          },
          ...prev,
        ]);
      }

      // Gym membership: charge weekly at start of each week (first week free if joined mid-week)
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

      if (newRentOverdue && newRentOverdueSinceDay > 0) {
        if (newDayOfYear === newRentOverdueSinceDay + 1) {
          setEventLog((prev) => [
            {
              id: Date.now() + 850,
              text: '📱 Rent notice: You have not paid rent for this week. Pay soon to avoid eviction.',
              timestamp: formatTimestamp(newYear, newDayOfYear, newHourOfDay),
              effects: {},
            },
            ...prev,
          ]);
        }
        if (newDayOfYear === newRentOverdueSinceDay + 5) {
          setEventLog((prev) => [
            {
              id: Date.now() + 851,
              text: '📱 Final warning: Pay your rent by Sunday end of day or you will be evicted with no housing.',
              timestamp: formatTimestamp(newYear, newDayOfYear, newHourOfDay),
              effects: {},
            },
            ...prev,
          ]);
        }
        if (daysSinceOverdueDay(newDayOfYear, newRentOverdueSinceDay) >= 7) {
          newSelectedApartment = null;
          newRentOverdue = false;
          newRentOverdueSinceDay = 0;
          setRentOverdue(false);
          setRentOverdueSinceDay(0);
          setSelectedApartment(null);
          const evictEntry: LogEntry = {
            id: Date.now() + 1000,
            text: '📱 You failed to pay rent in time and were evicted. You have no housing — open the map and visit the Housing Office to rent a place.',
            timestamp: formatTimestamp(newYear, newDayOfYear, newHourOfDay),
            effects: {},
          };
          setEventLog((prev) => [evictEntry, ...prev]);
        }
      }

      if (newSelectedApartment?.id && newSelectedApartment.id !== LIVE_WITH_PARENTS_ID) {
        const fe = getFridgeDailyEffects(homeFurniture);
        furnitureHappinessDelta += fe.happiness;
        furnitureHungerDelta += fe.hunger;
      }

      const skin = applySkincareForNewDay(workSkincare);
      skincareBeautyAccumulator += skin.totalBeauty;
      const skinLog = skin.message;
      if (skinLog) {
        setEventLog((prev) => [
          {
            id: Date.now() + 2100 + Math.floor(Math.random() * 900),
            text: skinLog,
            timestamp: formatTimestamp(newYear, newDayOfYear, newHourOfDay),
            effects: { beauty: skin.totalBeauty },
          },
          ...prev,
        ]);
      }
    }

    // Persist counter groceries & to-go when time passed, spoil ticks, or same-tick pantry overrides (e.g. pack to-go).
    if (daysCrossed > 0 || spoilDecayEvents > 0 || freshnessChanged || spoilOverridesApply) {
      setGroceryBuckets((prev) => {
        let next: GroceryBucketsState = {
          // Same-tick rebalance (e.g. buy fridge) passes full buckets; prev.fridge may not be flushed yet.
          fridge: spoilageOverrides?.groceryBuckets?.fridge ?? prev.fridge,
          counter: { regular: groceryR, lux: groceryL },
        };
        if (daysCrossed > 0 && newSelectedApartment?.id === LIVE_WITH_PARENTS_ID) {
          const cap = getFridgeMealCapacity(homeFurniture.fridgeId) ?? 8;
          next = topUpParentsFridge(next, cap);
        }
        groceryBucketsRef.current = next;
        return next;
      });
      setGroceryFreshness({ regular: freshR, lux: freshL });
      setTogoHome({ regular: thR, lux: thL });
      setTogoFreshHome({ regular: tfhR, lux: tfhL });
      setTogoCarried({ regular: tcR, lux: tcL });
      setTogoFreshCarried({ regular: tfcR, lux: tfcL });
    }
    if (spoilDecayEvents > 0) {
      const spoilText =
        selectedApartment?.id === LIVE_WITH_PARENTS_ID
          ? `Backpack to-go spoilage: ~50% lost per 12 in-game hours (${spoilDecayEvents} tick${spoilDecayEvents > 1 ? 's' : ''}). Freshness regular ${tfcR}% · luxury ${tfcL}%.`
          : `Food spoilage: ~50% lost per 12 in-game hours (${spoilDecayEvents} tick${spoilDecayEvents > 1 ? 's' : ''}). Counter ${freshR}% / ${freshL}% fresh · packed to-go & backpack meals degrading similarly.`;
      setEventLog((prev) => [
        {
          id: Date.now() + 150,
          text: spoilText,
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

    if (daysCrossed > 0) {
      setSkincareDoses(workSkincare);
    }

    const baseHappiness =
      stats.happiness + (effect.happiness || 0) + happinessDeltaFromParents + furnitureHappinessDelta;
    const baseHealth =
      stats.health + (effect.health || 0) + healthDeltaFromDaily + healthDeltaFromWeekly;
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
      beauty: round2(
        Math.max(
          0,
          Math.min(10, stats.beauty + (effect.beauty ?? 0) + skincareBeautyAccumulator)
        )
      ),
      smarts: round2(Math.max(0, Math.min(10, stats.smarts + (effect.smarts || 0)))),
      fitness: round2(Math.max(0, Math.min(10, stats.fitness + (effect.fitness ?? 0)))),
      social: round2(Math.max(0, Math.min(10, stats.social + (effect.social ?? 0)))),
    };

    // Starvation / exhaustion: health loss only after VITAL_DEPLETION_GRACE_HOURS at 0 hunger and/or 0 energy.
    const prevAccum = depletionHoursAccumRef.current;
    let newAccum = prevAccum;
    if (newStats.hunger <= 0 || newStats.energy <= 0) {
      newAccum = prevAccum + hoursPassed;
    } else {
      newAccum = 0;
    }
    depletionHoursAccumRef.current = newAccum;
    const prevOver = Math.max(0, prevAccum - VITAL_DEPLETION_GRACE_HOURS);
    const newOver = Math.max(0, newAccum - VITAL_DEPLETION_GRACE_HOURS);
    const deltaPenaltyHours = newOver - prevOver;
    let healthPenaltyDepletion = 0;
    if (newStats.hunger <= 0) healthPenaltyDepletion += 2 * deltaPenaltyHours;
    if (newStats.energy <= 0) healthPenaltyDepletion += 2 * deltaPenaltyHours;
    if (healthPenaltyDepletion > 0) {
      newStats.health = round2(Math.max(0, newStats.health - healthPenaltyDepletion));
    }

    const lifeStage = getLifeStage(newStats.year, newStats.dayOfYear, newStats.birthYear);
    const yearsAlive = getYearsAlive(newStats.year, newStats.dayOfYear, newStats.birthYear);
    if (lifeStage === 'elderly') {
      newStats.health = round2(Math.max(0, newStats.health - Math.floor(hoursPassed / 168)));
    }

    setStats(newStats);
    setActivityCount((prev) => prev + 1);

    // Log deltas as whole numbers for core needs (health, happiness, energy, hunger).
    const appliedHealth = intStat(newStats.health - stats.health);
    const appliedHappiness = intStat(newStats.happiness - stats.happiness);
    const appliedEnergy = intStat(newStats.energy - stats.energy);
    const appliedHunger = intStat(newStats.hunger - stats.hunger);
    const appliedBeauty = round2(newStats.beauty - stats.beauty);
    const appliedSmarts = round2(newStats.smarts - stats.smarts);
    const appliedFitness = round2(newStats.fitness - stats.fitness);
    const appliedSocial = round2(newStats.social - stats.social);
    const appliedMoney = round2(newStats.money - stats.money);
    const logEffects: LogEntry['effects'] = {};
    if (appliedHealth !== 0) logEffects.health = appliedHealth;
    if (appliedHappiness !== 0) logEffects.happiness = appliedHappiness;
    if (appliedEnergy !== 0) logEffects.energy = appliedEnergy;
    if (appliedHunger !== 0) logEffects.hunger = appliedHunger;
    if (appliedMoney !== 0) logEffects.money = appliedMoney;
    if (appliedBeauty !== 0) logEffects.beauty = appliedBeauty;
    if (appliedSmarts !== 0) logEffects.smarts = appliedSmarts;
    if (appliedFitness !== 0) logEffects.fitness = appliedFitness;
    if (appliedSocial !== 0) logEffects.social = appliedSocial;

    const depletionWarnings: string[] = [];
    if (stats.hunger > 0 && newStats.hunger <= 0) {
      depletionWarnings.push(
        `⚠️ Hunger hit 0 — starvation will not reduce health for the first ${VITAL_DEPLETION_GRACE_HOURS} in-game hours; after that, health drops until you eat.`
      );
    }
    if (stats.energy > 0 && newStats.energy <= 0) {
      depletionWarnings.push(
        `⚠️ Energy hit 0 — exhaustion will not reduce health for the first ${VITAL_DEPLETION_GRACE_HOURS} in-game hours; after that, health drops until you sleep or recover.`
      );
    }
    if (
      prevAccum < VITAL_DEPLETION_GRACE_HOURS &&
      newAccum >= VITAL_DEPLETION_GRACE_HOURS &&
      (newStats.hunger <= 0 || newStats.energy <= 0)
    ) {
      depletionWarnings.push(
        '⚠️ Past the grace period at 0 hunger or energy — your health will now drop until you recover.'
      );
    }

    let logText = happinessDeltaFromParents < 0
      ? `${resultText} (Living with parents: limited independence, -${intStat(Math.abs(happinessDeltaFromParents))} happiness.)`
      : resultText;
    if (depletionWarnings.length > 0) {
      logText = `${logText} ${depletionWarnings.join(' ')}`;
    }
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

  useEffect(() => {
    if (stage !== 'playing') return;
    if (gamePhase !== 'park' || parkDistrict !== 'Dewmist') return;
    if (!isFullMoonCalendarDay(stats.dayOfYear) || !isNightHour(stats.hourOfDay)) return;
    const key = `${stats.year}-${stats.dayOfYear}`;
    if (fullMoonDewmistParkWitnessRef.current === key) return;
    if (fullMoonEventOpen) return;
    setFullMoonEventKey(key);
    setFullMoonSubStep(0);
    setFullMoonEventOpen(true);
  }, [stage, gamePhase, parkDistrict, stats.year, stats.dayOfYear, stats.hourOfDay, stats.birthYear]);

  const handleMapActivity = (
    effect: {
      health?: number;
      happiness?: number;
      energy?: number;
      hunger?: number;
      money?: number;
      beauty?: number;
      smarts?: number;
      fitness?: number;
      social?: number;
    },
    resultText: string,
    hoursPassed: number,
    overrideRentPerSeason?: number
  ) => advanceTime(effect, resultText, hoursPassed, overrideRentPerSeason);

  type NpcIntroBeat = {
    scene: string;
    line: string;
    portraitFrom: string;
    portraitTo: string;
  };

  const NPC_INTRO_BEATS: Partial<Record<NpcId, NpcIntroBeat[]>> = {
    'gym-lucia': [
      {
        scene:
          'You step into the gym lobby. The air smells like rubber mats and old wood benches. You ask where the lounge is—then you get pointed the wrong way and end up back near the lockers. When you turn again, Lucia is already looking at you like she recognized your confusion.',
        line:
          "Hey… you look brand-new. I’m Lucia Chen. Welcome to Budget Gym. If you want, I’ll show you the lounge before you start getting sweaty.",
        portraitFrom: '#b45309',
        portraitTo: '#7c2d12',
      },
    ],
    'neighbor-sam': [
      {
        scene:
          'You try the right door first. It’s not yours. The hallway echoes anyway, and you follow the wrong footsteps down one flight. Then you finally hear the correct “click” and Sam is there—standing halfway inside, keys in hand, already smiling like you belong here.',
        line:
          "Oh! You’re my neighbor. I’m Sam Rivera. Sorry—neighbors always end up doing the “wrong door” dance first. If you need anything, knock.",
        portraitFrom: '#1d4ed8',
        portraitTo: '#1e3a5f',
      },
    ],
    'park-jordan': [
      {
        scene:
          'You start your walk with good intentions. The path loops, and you accidentally pick the long way. Near the fountain, someone waves from a bench as if you’re late to something you never knew about. It clicks: Jordan, watching the ducks like they’re the whole schedule.',
        line:
          "Nice day for a walk. I’m Jordan Lee. You’re probably wondering where the “short loop” is—right over there. Want to pace together?",
        portraitFrom: '#0f766e',
        portraitTo: '#115e59',
      },
    ],
  };

  const commitNpcTalk = (id: NpcId, opts?: { dialogueLineOverride?: string }) => {
    const dayKey = gameDayKey(stats.year, stats.dayOfYear);
    const lastBump = npcRelationshipLastBumpDayRef.current[id];
    const prevCount = npcInteractionsRef.current[id] ?? 0;

    let dialogueLine = opts?.dialogueLineOverride;

    if (lastBump !== dayKey) {
      const newCount = prevCount + 1;
      if (!dialogueLine) dialogueLine = pickTalkDialogue(id, newCount);
      const nextInteractions = { ...npcInteractionsRef.current, [id]: newCount };
      const nextBumpDays = { ...npcRelationshipLastBumpDayRef.current, [id]: dayKey };
      npcInteractionsRef.current = nextInteractions;
      npcRelationshipLastBumpDayRef.current = nextBumpDays;
      setNpcInteractions(nextInteractions);
      setNpcRelationshipLastBumpDay(nextBumpDays);
    } else {
      if (!dialogueLine) dialogueLine = pickTalkDialogue(id, prevCount);
    }

    // Safety fallback (should never be hit).
    if (!dialogueLine) dialogueLine = pickTalkDialogue(id, prevCount + 1);

    const name = npcById(id)?.name ?? 'Someone';
    advanceTime({ happiness: TALK_HAPPINESS, social: TALK_SOCIAL_SKILL }, `Chat with ${name}: ${dialogueLine}`, TALK_SOCIAL_HOURS);
  };

  const talkToNpc = (id: NpcId) => {
    const prevCount = npcInteractionsRef.current[id] ?? 0;
    const beats = NPC_INTRO_BEATS[id];
    const hasIntro = prevCount === 0 && beats && beats.length > 0;

    if (hasIntro && !npcIntroOpen) {
      npcIntroCommitLockRef.current = false;
      setNpcIntroNpcId(id);
      setNpcIntroSubStep(0);
      setNpcIntroOpen(true);
      return;
    }

    commitNpcTalk(id);
  };

  const npcIntroBeats = npcIntroNpcId ? NPC_INTRO_BEATS[npcIntroNpcId] ?? [] : [];
  const npcIntroSubStepsTotal = npcIntroBeats.length * 2;
  const npcIntroBeatIndex = Math.floor(npcIntroSubStep / 2);
  const npcIntroBeatPhase: 'story' | 'dialogue' = npcIntroSubStep % 2 === 0 ? 'story' : 'dialogue';
  const npcIntroBeat = npcIntroBeats[npcIntroBeatIndex] ?? npcIntroBeats[0];
  const npcIntroProfile = npcIntroNpcId ? npcById(npcIntroNpcId) : null;
  const npcIntroPortraitInitial = npcIntroProfile?.name?.trim().charAt(0).toUpperCase() ?? '?';
  const isLastNpcIntroStep = npcIntroSubStepsTotal > 0 && npcIntroSubStep >= npcIntroSubStepsTotal - 1;

  const FULL_MOON_BEAT = {
    scene:
      'The air in Dewmist turns quiet in a way that feels deliberate. Leaves stop rustling. The city noise thins out. You look up—',
    line:
      'A full moon hangs over the park, so bright it paints the path in silver. For a moment, you forget your schedule. You just… exist here.',
    portraitFrom: '#0f172a',
    portraitTo: '#312e81',
  } as const;
  const fullMoonSubStepsTotal = 2;
  const fullMoonBeatPhase: 'story' | 'dialogue' = fullMoonSubStep % 2 === 0 ? 'story' : 'dialogue';
  const isLastFullMoonStep = fullMoonSubStep >= fullMoonSubStepsTotal - 1;
  const fullMoonPortraitInitial = 'M';

  const npcIntroFullText =
    npcIntroBeatPhase === 'story' ? (npcIntroBeat?.scene ?? '') : (npcIntroBeat?.line ?? '');
  const npcIntroBeatTyping = useStoryBeatTyping(npcIntroFullText, npcIntroSubStep);

  const fullMoonFullText =
    fullMoonBeatPhase === 'story' ? FULL_MOON_BEAT.scene : FULL_MOON_BEAT.line;
  const fullMoonBeatTyping = useStoryBeatTyping(fullMoonFullText, fullMoonSubStep);

  const introWelcomeTyping = useStoryBeatTyping(
    INTRO_WELCOME_MESSAGE,
    introWelcomeBeatKey,
    undefined,
    undefined,
    stage === 'intro' && !introRevealStarted && introWelcomeLineStarted
  );

  const commitFullMoonMoment = () => {
    if (!fullMoonEventKey) return;
    if (fullMoonDewmistParkWitnessRef.current === fullMoonEventKey) return;
    fullMoonDewmistParkWitnessRef.current = fullMoonEventKey;
    const bonus = FULL_MOON_DEWMIST_PARK_HAPPINESS;
    const timestamp = `${formatDate(stats.year, stats.dayOfYear)} ${formatTime(stats.hourOfDay)} · ${getLifeStage(stats.year, stats.dayOfYear, stats.birthYear)}`;
    setStats((s) => ({
      ...s,
      happiness: round2(Math.max(0, Math.min(100, s.happiness + bonus))),
    }));
    setEventLog((prev) => [
      {
        id: Date.now() + 88_888,
        text: '🌕 You saw a beautiful full moon in Dewmist Park.',
        timestamp,
        effects: { happiness: bonus },
      },
      ...prev,
    ]);
  };

  const startDatingNpc = (id: NpcId) => {
    const count = npcInteractionsRef.current[id] ?? 0;
    if (count < 50) return;
    if (datingPartnerId != null && datingPartnerId !== id) {
      setEventLog((prev) => [
        {
          id: Date.now(),
          text: "You're already dating someone else.",
          timestamp: formatTimestamp(stats.year, stats.dayOfYear, stats.hourOfDay),
          effects: {},
        },
        ...prev,
      ]);
      return;
    }
    if (datingPartnerId === id) return;
    setDatingPartnerId(id);
    const name = npcById(id)?.name ?? 'them';
    advanceTime(
      { happiness: 12, social: 0.03 },
      `You asked ${name} out—you're dating!`,
      0.5
    );
  };

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
    const WEEK_END_DAYS = [7, 14, 21, 28, 35, 42, 49, 56, 63, 70, 77, 84, 91, 98, 105, 112];
    const rentForSeason =
      selectedApartment.id === UNIVERSITY_HOUSING_ID && educationLevel === 'in-progress'
        ? UNIVERSITY_HOUSING_STUDENT_RENT
        : selectedApartment.rent;
    const rentForWeek = Math.round((rentForSeason / 4) * 100) / 100;

    const weekIndex = WEEK_END_DAYS.findIndex((d) => d >= stats.dayOfYear);
    const currentWeekEnd = weekIndex >= 0 ? WEEK_END_DAYS[weekIndex] : 112;
    const targetWeekEnd = rentOverdue
      ? (rentOverdueSinceDay === 1 ? 112 : rentOverdueSinceDay - 1)
      : currentWeekEnd;

    if (lastRentPaidSeasonEndDay != null && lastRentPaidSeasonEndDay >= targetWeekEnd && !rentOverdue) {
      setEventLog((prev) => [{
        id: Date.now(),
        text: 'You already paid rent for this week.',
        timestamp: formatTimestamp(stats.year, stats.dayOfYear, stats.hourOfDay),
        effects: {},
      }, ...prev]);
      return false;
    }
    if (stats.money < rentForWeek) {
      setEventLog((prev) => [{
        id: Date.now(),
        text: `You can't afford rent ($${rentForWeek.toLocaleString()}). You have $${stats.money.toLocaleString()}.`,
        timestamp: formatTimestamp(stats.year, stats.dayOfYear, stats.hourOfDay),
        effects: {},
      }, ...prev]);
      return false;
    }
    setStats((prev) => ({ ...prev, money: prev.money - rentForWeek }));
    setLastRentPaidSeasonEndDay(targetWeekEnd);
    if (rentOverdue) { setRentOverdue(false); setRentOverdueSinceDay(0); }
    setEventLog((prev) => [{
      id: Date.now(),
      text: `You paid $${rentForWeek.toLocaleString()} rent for the week.`,
      timestamp: formatTimestamp(stats.year, stats.dayOfYear, stats.hourOfDay),
      effects: { money: -rentForWeek },
    }, ...prev]);
    return true;
  };

  const startDegree = (degree: Degree): boolean => {
    const campus = getSchoolCampusAccess(stats.dayOfYear);
    if (!campus.open) {
      setEventLog((prev) => [
        {
          id: Date.now(),
          text: campus.closedReason ?? 'School is not open right now.',
          timestamp: formatTimestamp(stats.year, stats.dayOfYear, stats.hourOfDay),
          effects: {},
        },
        ...prev,
      ]);
      return false;
    }

    const SEASON_END_DAYS = [28, 56, 84, 112];
    const seasonEnd = SEASON_END_DAYS.find((d) => d >= stats.dayOfYear) ?? 112;
    const tuitionCoversThisSeason =
      tuitionPaidThroughSeasonEndDay != null && tuitionPaidThroughSeasonEndDay >= seasonEnd;

    if (!tuitionCoversThisSeason) {
      const paidAmount = payTuitionForCurrentSeason(false);
      if (paidAmount === null) return false;
    }

    setEducationDegree(degree);
    setEducationLevel('in-progress');
    setEducationProgress(0);
    return true;
  };

  type StudyIntensity = 'slack' | 'normal' | 'focus';

  const DEGREE_DAYS_NORMAL = 80; // days of normal effort (8h each) to complete degree
  const STUDY_HOURS_PER_DAY = 8; // 8 hours of study = same effects as old "study for a day"

  const study = (intensity: StudyIntensity, hours: number) => {
    if (!educationDegree) return;

    const campus = getSchoolCampusAccess(stats.dayOfYear);
    if (!campus.open) {
      setEventLog((prev) => [
        {
          id: Date.now(),
          text: campus.closedReason ?? 'Campus is closed this part of the season.',
          timestamp: formatTimestamp(stats.year, stats.dayOfYear, stats.hourOfDay),
          effects: {},
        },
        ...prev,
      ]);
      return;
    }

    // Block study if tuition for this season has not been paid.
    const SEASON_END_DAYS = [28, 56, 84, 112];
    const seasonEnd = SEASON_END_DAYS.find((d) => d >= stats.dayOfYear) ?? 112;
    if (tuitionPaidThroughSeasonEndDay == null || tuitionPaidThroughSeasonEndDay < seasonEnd) {
      const warningEntry: LogEntry = {
        id: Date.now(),
        text: 'Pay tuition for this season on your phone before you can study. Every season requires a new tuition payment.',
        timestamp: formatTimestamp(stats.year, stats.dayOfYear, stats.hourOfDay),
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
      hunger: baseEffects.hunger * scale * STUDY_HUNGER_DRAIN_MULTIPLIER,
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

  /** Overtime is optional — only leaving during the regular shift (before OT window) hurts performance. */
  const shouldApplyLeaveWorkPenalty = (): boolean => {
    if (!selectedJob) return false;
    if (selectedJob.workStartHour === 0 && selectedJob.workEndHourFull === 24) return false;
    if (!hasWaitedFirstDayForJob()) return false;
    if (!isWeekday()) return false;
    return canWorkNow();
  };

  const executeNavigateTo = (
    target: GamePhase,
    opts?: {
      parkDistrict?: DistrictName;
      groceryDistrict?: DistrictName;
      furnitureDistrict?: DistrictName;
      gymDistrict?: 'Dewmist' | 'Semba' | 'Marina';
    }
  ) => {
    if (target === 'park' && opts?.parkDistrict) setParkDistrict(opts.parkDistrict);
    if (target === 'grocery' && opts?.groceryDistrict) setGroceryDistrict(opts.groceryDistrict);
    if (target === 'furniture' && opts?.furnitureDistrict) setFurnitureDistrict(opts.furnitureDistrict);
    if (target === 'gym' && opts?.gymDistrict) setGymDistrict(opts.gymDistrict);
    const mins = getTravelMinutes(
      gamePhase,
      target,
      selectedApartment?.district,
      parkDistrict,
      groceryDistrict,
      furnitureDistrict,
      opts?.parkDistrict,
      opts?.groceryDistrict,
      opts?.furnitureDistrict,
      target === 'work' || gamePhase === 'work' ? selectedJob?.district : undefined,
      gymDistrict,
      target === 'gym' ? opts?.gymDistrict : undefined
    );
    if (mins > 0) {
      advanceTime({ hunger: -0.5 }, `Traveled (${mins} mins).`, mins / 60);
    }
    setGamePhase(target);
  };

  const applyLeaveWorkPenaltyAndNavigate = (
    target: GamePhase,
    opts?: {
      parkDistrict?: DistrictName;
      groceryDistrict?: DistrictName;
      furnitureDistrict?: DistrictName;
      gymDistrict?: 'Dewmist' | 'Semba' | 'Marina';
    }
  ) => {
    setJobPerformance((p) => Math.max(0, p - LEAVE_WORK_PERFORMANCE_PENALTY));
    setEventLog((prev) => [
      {
        id: Date.now(),
        text: `You left the workplace. Job performance −${LEAVE_WORK_PERFORMANCE_PENALTY} (leaving work early hurts your standing).`,
        timestamp: formatTimestamp(stats.year, stats.dayOfYear, stats.hourOfDay),
        effects: {},
      },
      ...prev,
    ]);
    executeNavigateTo(target, opts);
  };

  const navigateTo = (
    target: GamePhase,
    opts?: {
      parkDistrict?: DistrictName;
      groceryDistrict?: DistrictName;
      furnitureDistrict?: DistrictName;
      gymDistrict?: 'Dewmist' | 'Semba' | 'Marina';
    }
  ) => {
    if (gamePhase === 'work' && target !== 'work') {
      if (shouldApplyLeaveWorkPenalty()) {
        const warned = leaveWorkDialogShownForDayRef.current;
        const alreadyWarnedToday =
          warned != null && warned.year === stats.year && warned.dayOfYear === stats.dayOfYear;
        if (alreadyWarnedToday) {
          applyLeaveWorkPenaltyAndNavigate(target, opts);
        } else {
          leaveWorkDialogShownForDayRef.current = {
            year: stats.year,
            dayOfYear: stats.dayOfYear,
          };
          setPendingLeaveWork({ target, opts });
        }
        return;
      }
    }
    executeNavigateTo(target, opts);
  };

  const cancelLeaveWork = () => {
    setPendingLeaveWork(null);
  };

  const confirmLeaveWork = () => {
    if (!pendingLeaveWork) return;
    const { target, opts } = pendingLeaveWork;
    setPendingLeaveWork(null);
    applyLeaveWorkPenaltyAndNavigate(target, opts);
  };

  const campusAccess = getSchoolCampusAccess(stats.dayOfYear);
  const tuitionSeasonIdx = SEASON_END_DAYS_SCHOOL.findIndex((d) => d >= stats.dayOfYear);
  const tuitionSeasonEndForUi = SEASON_END_DAYS_SCHOOL[tuitionSeasonIdx >= 0 ? tuitionSeasonIdx : 3];
  const tuitionPaidCurrentSeason =
    tuitionPaidThroughSeasonEndDay != null && tuitionPaidThroughSeasonEndDay >= tuitionSeasonEndForUi;

  const goToSchool = () => {
    if (!campusAccess.open) {
      setEventLog((prev) => [
        {
          id: Date.now(),
          text: campusAccess.closedReason ?? 'School is closed.',
          timestamp: formatTimestamp(stats.year, stats.dayOfYear, stats.hourOfDay),
          effects: {},
        },
        ...prev,
      ]);
      return;
    }
    navigateTo('school');
  };

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
        ? `You switched to ${gymName} ($${formatMoney(weeklyCost)}/week). Prorated this week: $${formatMoney(proratedCost)}.`
        : `You joined ${gymName} ($${formatMoney(weeklyCost)}/week). Prorated this week: $${formatMoney(proratedCost)}.`,
      0
    );
  };

  const gymWorkout = (tier: GymTier, intensity: 'easy' | 'normal' | 'intense') => {
    const { energyCost, healthGain } = WORKOUT_EFFECTS[intensity];
    const fitnessGain = WORKOUT_FITNESS_GAIN[intensity];
    const hungerCost = -10;
    const happinessDelta = GYM_HAPPINESS[tier];
    if (stats.energy < energyCost) return;
    const happyMsg =
      happinessDelta > 0
        ? `, Happiness +${happinessDelta}`
        : happinessDelta < 0
          ? `, Happiness ${happinessDelta}`
          : '';
    const glow = rollWorkoutBeautyDelta(1);
    const glowMsg =
      glow > 0 ? ` Post-workout glow: beauty +${fmt2(glow)} (${Math.round(WORKOUT_BEAUTY_CHANCE_PER_HOUR * 100)}% chance per hour).` : '';
    advanceTime(
      {
        health: healthGain,
        happiness: happinessDelta,
        energy: -energyCost,
        hunger: hungerCost,
        fitness: fitnessGain,
        beauty: glow,
      },
      `You worked out at the gym (${intensity}) for 1 hour. Health +${healthGain}${happyMsg}, Fitness +${fmt2(fitnessGain)}.${glowMsg}`,
      1
    );
  };

  const gymChill = (hours: number) => {
    const happy = intStat(hours * 2);
    const hungerLoss = -intStat(10 * hours);
    const energyGain = intStat(5 * hours);
    const socialGain = round2(GYM_LOUNGE_SOCIAL_PER_HOUR * hours);
    advanceTime(
      { happiness: happy, energy: energyGain, hunger: hungerLoss, social: socialGain },
      `You relaxed in the gym lounge for ${hours} hour${hours > 1 ? 's' : ''}. Happiness +${happy}, energy +${energyGain}, hunger ${hungerLoss}, Social +${fmt2(socialGain)}.`,
      hours
    );
  };

  const buySnackAtGym = (snackId: SnackId, price: number) => {
    const s = SNACK_BY_ID[snackId];
    if (!s || stats.money < price) return;
    const cap = getBackpackCapacity(backpackId);
    const used = getUsedBackpackSpace(snackCounts, togoCarried);
    if (!backpackId || cap <= 0 || used + s.spaceUnits > cap) return;
    setSnackCounts((prev) => ({ ...prev, [snackId]: (prev[snackId] ?? 0) + 1 }));
    advanceTime(
      { money: -price },
      `You bought ${s.label} at the gym ($${formatMoney(price)}).`,
      0.1
    );
  };

  const parkWalk = () => {
    const energyCost = 10;
    const healthGain = 1;
    const hungerCost = -5;
    if (stats.energy < energyCost) return;
    const weather = getWeatherForDay(stats.year, stats.dayOfYear);
    const happinessBonus = isGoodWeatherForWalk(weather.quality) ? 1 : 0;
    const effects: {
      health?: number;
      happiness?: number;
      energy?: number;
      hunger?: number;
      social?: number;
      beauty?: number;
    } = {
      health: healthGain,
      energy: -energyCost,
      hunger: hungerCost,
      social: PARK_WALK_SOCIAL_GAIN,
    };
    if (happinessBonus > 0) effects.happiness = happinessBonus;
    const walkGlow = rollWorkoutBeautyDelta(1);
    if (walkGlow > 0) effects.beauty = walkGlow;
    const glowMsg =
      walkGlow > 0
        ? ` Fresh-air glow: beauty +${fmt2(walkGlow)} (${Math.round(WORKOUT_BEAUTY_CHANCE_PER_HOUR * 100)}% chance per hour of activity).`
        : '';
    const msg =
      happinessBonus > 0
        ? `You took a walk in the park for 1 hour. Nice weather! Health +1, Happiness +1. Energy −10, Hunger −5, Social +${fmt2(PARK_WALK_SOCIAL_GAIN)}.${glowMsg}`
        : `You took a walk in the park for 1 hour. Health +1. Energy −10, Hunger −5, Social +${fmt2(PARK_WALK_SOCIAL_GAIN)}.${glowMsg}`;
    advanceTime(effects, msg, 1);
  };

  const sleep = (hours: number) => {
    const bedBonus = getSleepEnergyBonusPerHour(homeFurniture);
    const basePerHour = 10;
    const perHour = basePerHour + bedBonus;
    const capRoom = 100 - stats.energy;
    const rawTotal = hours * perHour;
    const energyGain = Math.min(rawTotal, capRoom);
    const hungerLost = SLEEP_HUNGER_PER_HOUR * hours;
    const durationLabel =
      hours === 0.5 ? '30 minutes' : `${hours} hour${hours > 1 ? 's' : ''}`;
    const bedWord = homeFurniture.bedId == null ? 'no bed' : 'bed';
    const rateMath = `10 base ${bedBonus >= 0 ? '+' : '−'} ${Math.abs(bedBonus)} (${bedWord}) = ${intStat(perHour)}/hr`;
    const productMath = `${intStat(perHour)}/hr × ${hours === 0.5 ? '0.5' : hours}h = ${intStat(rawTotal)}`;
    const capNote =
      intStat(energyGain) < intStat(rawTotal)
        ? `, capped to +${intStat(energyGain)} (only +${intStat(capRoom)} until full)`
        : '';
    advanceTime(
      { energy: energyGain, hunger: -hungerLost },
      `You slept for ${durationLabel}. Energy +${intStat(energyGain)} — ${rateMath}; ${productMath}${capNote}. Hunger −${fmt2(hungerLost)} (${SLEEP_HUNGER_PER_HOUR}/hr while sleeping).`,
      hours
    );
    setGamePhase('home');
  };

  const buyGroceries = (_option: string, meals: number, hungerPerMeal: number, cost: number) => {
    if (stats.money < cost) return;
    const isLux = hungerPerMeal >= 50;
    const key = isLux ? ('lux' as const) : ('regular' as const);
    const base = groceryBucketsRef.current;
    const newCounter = { ...base.counter, [key]: base.counter[key] + meals };
    const merged = rebalanceGroceriesToFridge(base.fridge, newCounter, getEffectiveFridgeCap());
    groceryBucketsRef.current = merged;
    setGroceryFreshness((f) => {
      const oldN = base.counter[key];
      const newN = merged.counter[key];
      const nf = newN === 0 ? 100 : clampFreshnessPct(Math.round((oldN * f[key] + meals * 100) / newN));
      return { ...f, [key]: nf };
    });
    setGroceryBuckets(merged);
    advanceTime(
      { money: -cost },
      `You bought groceries (${meals} meals, ${hungerPerMeal} hunger/meal).`,
      0,
      undefined,
      { groceryBuckets: merged }
    );
  };

  const buyFastFood = (name: string, hungerGain: number, cost: number, healthPenalty: number) => {
    if (stats.money < cost) return;
    advanceTime(
      { money: -cost, hunger: hungerGain, health: -healthPenalty },
      `You grabbed ${name}. Hunger +${hungerGain}, health −${healthPenalty} (fast food tradeoff).`,
      0.25
    );
  };

  const buySkincare = (id: SkincareId) => {
    const p = SKINCARE_PRODUCTS.find((x) => x.id === id);
    if (!p || stats.money < p.cost) return;
    setSkincareDoses((prev) => {
      const next = { ...prev, [id]: prev[id] + p.dosesPerPurchase };
      skincareDosesRef.current = next;
      return next;
    });
    advanceTime(
      { money: -p.cost },
      `You bought ${p.name} ($${formatMoney(p.cost)}). +${p.dosesPerPurchase} daily uses — each in-stock product auto-applies once per in-game morning (skincare routine).`,
      0.25
    );
  };

  const getHaircut = (id: HaircutId) => {
    const opt = HAIRCUT_OPTIONS.find((h) => h.id === id);
    if (!opt) return;

    const cd = haircutCooldownStatus(
      lastHaircutYear,
      lastHaircutDayOfYear,
      stats.year,
      stats.dayOfYear,
      START_YEAR,
      DAYS_PER_YEAR
    );
    if (!cd.canCut) {
      const nextLabel = formatDate(cd.nextYear, cd.nextDayOfYear);
      const entry: LogEntry = {
        id: Date.now(),
        text: `Salon: you can only get a haircut once per week. Come back in ${cd.daysRemaining} day${cd.daysRemaining === 1 ? '' : 's'} — next appointment available ${nextLabel}.`,
        timestamp: formatTimestamp(stats.year, stats.dayOfYear, stats.hourOfDay),
        effects: {},
      };
      setEventLog((prev) => [entry, ...prev]);
      return;
    }

    if (stats.money < opt.cost) {
      const entry: LogEntry = {
        id: Date.now(),
        text: `Salon: you don't have enough for ${opt.label} — need $${formatMoney(opt.cost)} (you have $${formatMoney(stats.money)}).`,
        timestamp: formatTimestamp(stats.year, stats.dayOfYear, stats.hourOfDay),
        effects: {},
      };
      setEventLog((prev) => [entry, ...prev]);
      return;
    }

    const y0 = stats.year;
    const d0 = stats.dayOfYear;
    const { delta, flavor } = rollHaircutBeautyDelta(id);
    const adj = round2(delta);
    let msg = `Salon: ${opt.label} ($${formatMoney(opt.cost)}, 1 hr).`;
    if (flavor === 'up') msg += ` You love it — beauty +${fmt2(adj)}.`;
    else if (flavor === 'down') msg += ` Not your best look — beauty ${fmt2(adj)}.`;
    else msg += ` Looks okay — beauty unchanged.`;
    advanceTime({ money: -opt.cost, beauty: adj }, msg, 1);
    setLastHaircutYear(y0);
    setLastHaircutDayOfYear(d0);
  };

  const eatSchoolCafe = (name: string, hungerGain: number, cost: number, healthPenalty: number) => {
    if (stats.money < cost) return;
    advanceTime(
      { money: -cost, hunger: hungerGain, health: -healthPenalty },
      `You ate ${name} at the campus café. Hunger +${hungerGain}, health −${healthPenalty}.`,
      0.25
    );
  };

  const chillAtSchool = (hours: number) => {
    const happy = intStat(hours * 2);
    const hungerLoss = -intStat(10 * hours);
    const energyGain = intStat(5 * hours);
    const socialGain = round2(SCHOOL_LOUNGE_SOCIAL_PER_HOUR * hours);
    advanceTime(
      { happiness: happy, energy: energyGain, hunger: hungerLoss, social: socialGain },
      `You relaxed in the student lounge for ${hours} hour${hours > 1 ? 's' : ''}. Happiness +${happy}, energy +${energyGain}, hunger ${hungerLoss}, Social +${fmt2(socialGain)}.`,
      hours
    );
  };

  const publicNapAtSchool = (hours: number) => {
    const energyGain = intStat(10 * hours);
    advanceTime(
      { energy: energyGain, happiness: -2 },
      `You took a public nap in the lounge for ${hours} hour${hours > 1 ? 's' : ''}. Energy +${energyGain}, happiness −2 (no hunger change).`,
      hours
    );
  };

  const eatMeal = (type: 'regular' | 'lux') => {
    const stoveBonus = getEatHungerBonus(homeFurniture);
    const base = type === 'regular' ? 30 : 50;
    const hungerGain = base + stoveBonus;
    const key = type;
    if (groceries[key] <= 0) return;
    const next = consumeOneHomeMeal(groceryBuckets, type);
    if (!next) return;
    setGroceryBuckets(next);
    advanceTime(
      { hunger: hungerGain },
      `You ate a ${type} meal (30 min). Hunger +${hungerGain}${stoveBonus > 0 ? ` (stove +${stoveBonus})` : ''}.`,
      0.5,
      undefined,
      { groceryBuckets: next }
    );
  };

  const prepareTogoMeal = (type: 'regular' | 'lux') => {
    const key = type;
    const buckets = groceryBucketsRef.current;
    const pantryR = buckets.fridge.regular + buckets.counter.regular;
    const pantryL = buckets.fridge.lux + buckets.counter.lux;
    if ((key === 'regular' ? pantryR : pantryL) <= 0) return;
    const nextB = consumeOneHomeMeal(buckets, type);
    if (!nextB) return;
    const th = togoHomeRef.current;
    const tfh = togoFreshHomeRef.current;
    const oldPacked = th[key];
    const newTh = { ...th, [key]: oldPacked + 1 };
    const blendedTfh =
      newTh[key] === 0
        ? 100
        : clampFreshnessPct(Math.round((oldPacked * tfh[key] + 100) / newTh[key]));
    const newTfh = { ...tfh, [key]: blendedTfh };
    groceryBucketsRef.current = nextB;
    togoHomeRef.current = newTh;
    togoFreshHomeRef.current = newTfh;
    setGroceryBuckets(nextB);
    setTogoHome(newTh);
    setTogoFreshHome(newTfh);
    advanceTime(
      {},
      `You packed a ${type} to-go meal (15 min). It sits ready at home — only packed meals can be stashed into your backpack.`,
      0,
      undefined,
      { groceryBuckets: nextB, togoHome: newTh, togoFreshHome: newTfh }
    );
  };

  const stashTogoInBackpack = (type: 'regular' | 'lux') => {
    const key = type;
    const th0 = togoHomeRef.current;
    const tfh0 = togoFreshHomeRef.current;
    const tc0 = togoCarriedRef.current;
    const tfc0 = togoFreshCarriedRef.current;
    if (th0[key] <= 0) return;
    const cap = getBackpackCapacity(backpackId);
    const used = getUsedBackpackSpace(snackCounts, tc0);
    if (cap <= 0 || used + TOGO_MEAL_SPACE_UNITS > cap) {
      setEventLog((prev) => [
        {
          id: Date.now(),
          text: `Need ${TOGO_MEAL_SPACE_UNITS} free backpack space to carry a to-go meal (currently ${used}/${cap}).`,
          timestamp: formatTimestamp(stats.year, stats.dayOfYear, stats.hourOfDay),
          effects: {},
        },
        ...prev,
      ]);
      return;
    }
    const sliceFresh = tfh0[key];
    const newTh = { ...th0, [key]: th0[key] - 1 };
    const oldCarried = tc0[key];
    const newTc = { ...tc0, [key]: oldCarried + 1 };
    const blendedCarriedFresh = clampFreshnessPct(
      newTc[key] === 0 ? 100 : Math.round((oldCarried * tfc0[key] + sliceFresh) / newTc[key])
    );
    const newTfc = { ...tfc0, [key]: blendedCarriedFresh };

    togoHomeRef.current = newTh;
    togoCarriedRef.current = newTc;
    togoFreshCarriedRef.current = newTfc;
    setTogoHome(newTh);
    setTogoCarried(newTc);
    setTogoFreshCarried(newTfc);
    advanceTime(
      {},
      `You stashed a packed ${type} to-go meal in your backpack (${TOGO_MEAL_SPACE_UNITS} space).`,
      0,
      undefined,
      { togoHome: newTh, togoFreshHome: tfh0, togoCarried: newTc, togoFreshCarried: newTfc }
    );
  };

  const eatTogoFromBackpack = (type: 'regular' | 'lux') => {
    const key = type;
    const tc0 = togoCarriedRef.current;
    const tfc0 = togoFreshCarriedRef.current;
    if (tc0[key] <= 0) return;
    const stoveBonus = getEatHungerBonus(homeFurniture);
    const base = type === 'regular' ? 30 : 50;
    const hungerGain = base + stoveBonus;
    const newN = tc0[key] - 1;
    const newTc = { ...tc0, [key]: newN };
    const newTfc = { ...tfc0, [key]: newN <= 0 ? 100 : tfc0[key] };
    togoCarriedRef.current = newTc;
    togoFreshCarriedRef.current = newTfc;
    setTogoCarried(newTc);
    setTogoFreshCarried(newTfc);
    bumpWorkBreakCreditIfBeforeFirstShift(EAT_TOGO_MEAL_HOURS);
    advanceTime(
      { hunger: hungerGain },
      `You ate a ${type} to-go meal (${fmt2(EAT_TOGO_MEAL_HOURS)} hr). Hunger +${hungerGain}${stoveBonus > 0 ? ` (stove +${stoveBonus})` : ''}.`,
      EAT_TOGO_MEAL_HOURS,
      undefined,
      { togoCarried: newTc, togoFreshCarried: newTfc }
    );
  };

  const chillAtHome = (hours: number) => {
    const decorBonus = getChillHappinessPerHour(homeFurniture);
    const happy = intStat(hours * (2 + decorBonus));
    const hungerLoss = -intStat(10 * hours);
    const energyGain = intStat(5 * hours);
    const socialGain = round2(HOME_CHILL_SOCIAL_PER_HOUR * hours);
    advanceTime(
      { happiness: happy, energy: energyGain, hunger: hungerLoss, social: socialGain },
      `You chilled at home for ${hours} hour${hours > 1 ? 's' : ''}. Happiness +${happy}, energy +${energyGain}, hunger ${hungerLoss}, Social +${fmt2(socialGain)}${decorBonus > 0 ? ` (decor +${intStat(decorBonus)}/hr chill)` : ''}.`,
      hours
    );
  };

  const watchTv = (hours: number) => {
    const perH = getWatchHappinessPerHour(homeFurniture);
    if (!homeFurniture.tvId || perH <= 0) return;
    const happy = intStat(hours * perH);
    const energyCost = -intStat(10 * hours);
    const hungerCost = -intStat(10 * hours);
    advanceTime(
      { happiness: happy, energy: energyCost, hunger: hungerCost },
      `You watched TV for ${hours} hour${hours > 1 ? 's' : ''}. Happiness +${happy}, energy ${energyCost}, hunger ${hungerCost} (up to ${perH}/hr with your set).`,
      hours
    );
  };

  const buyFurniture = (itemId: string) => {
    const item = FURNITURE_BY_ID[itemId];
    if (!item || stats.money < item.cost) return;

    if (item.category === 'fridge') {
      const cap = getFridgeMealCapacity(item.id) ?? 0;
      const gb = groceryBucketsRef.current;
      const merged = rebalanceGroceriesToFridge(gb.fridge, gb.counter, cap);
      spoilHoursBankRef.current = 0;
      groceryBucketsRef.current = merged;
      setHomeFurniture((prev) => ({ ...prev, fridgeId: item.id }));
      setGroceryBuckets(merged);
      setGroceryFreshness((f) => ({
        regular: merged.counter.regular > 0 ? f.regular : 100,
        lux: merged.counter.lux > 0 ? f.lux : 100,
      }));
      advanceTime(
        { money: -item.cost },
        `You bought ${item.icon} ${item.name} for $${item.cost.toLocaleString()}. Pantry food moved into the fridge up to its capacity.`,
        0.5,
        undefined,
        { groceryBuckets: merged }
      );
      return;
    }

    setHomeFurniture((prev) => {
      if (item.category === 'decoration') {
        if (prev.decorationIds.includes(item.id)) return prev;
        return { ...prev, decorationIds: [...prev.decorationIds, item.id] };
      }
      if (item.category === 'bed') return { ...prev, bedId: item.id };
      if (item.category === 'tv') return { ...prev, tvId: item.id };
      return { ...prev, stoveId: item.id };
    });
    advanceTime(
      { money: -item.cost },
      `You bought ${item.icon} ${item.name} for $${item.cost.toLocaleString()}.`,
      0.5
    );
  };

  const getOwnedFurnitureItems = (): FurnitureItem[] => {
    const h = homeFurniture;
    const out: FurnitureItem[] = [];
    if (h.bedId) {
      const it = FURNITURE_BY_ID[h.bedId];
      if (it) out.push(it);
    }
    if (h.fridgeId) {
      const it = FURNITURE_BY_ID[h.fridgeId];
      if (it) out.push(it);
    }
    if (h.stoveId) {
      const it = FURNITURE_BY_ID[h.stoveId];
      if (it) out.push(it);
    }
    if (h.tvId) {
      const it = FURNITURE_BY_ID[h.tvId];
      if (it) out.push(it);
    }
    for (const id of h.decorationIds) {
      const it = FURNITURE_BY_ID[id];
      if (it) out.push(it);
    }
    return out;
  };

  const SELL_ATTEMPT_HUNGER = -7;
  const SELL_ATTEMPT_ENERGY = -8;

  const trySellFurniture = (itemId: string) => {
    const item = FURNITURE_BY_ID[itemId];
    if (!item) return;
    if (!getOwnedFurnitureItems().some((x) => x.id === itemId)) return;

    setFurnitureSellOpen(false);
    const foundBuyer = Math.random() < 0.5;
    const pct = 0.2 + Math.random() * 0.6;
    const payout = Math.round(item.cost * pct * 100) / 100;
    const pctLabel = Math.round(pct * 100);

    if (!foundBuyer) {
      advanceTime(
        { hunger: SELL_ATTEMPT_HUNGER, energy: SELL_ATTEMPT_ENERGY },
        `You spent an hour listing and meeting buyers for your ${item.name}. Nobody committed — try another day. (Hunger ${SELL_ATTEMPT_HUNGER}, energy ${SELL_ATTEMPT_ENERGY}.)`,
        1
      );
      return;
    }

    advanceTime(
      { hunger: SELL_ATTEMPT_HUNGER, energy: SELL_ATTEMPT_ENERGY },
      `You spent an hour with buyers for your ${item.name}. Someone made an offer — decide in the pop-up. (Hunger ${SELL_ATTEMPT_HUNGER}, energy ${SELL_ATTEMPT_ENERGY}.)`,
      1
    );

    setFurnitureSellOffer({
      itemId: item.id,
      itemName: item.name,
      icon: item.icon,
      price: payout,
      pctLabel,
      originalCost: item.cost,
    });
    setFurnitureOfferOpen(true);
  };

  const acceptFurnitureOffer = () => {
    if (!furnitureSellOffer) return;
    const item = FURNITURE_BY_ID[furnitureSellOffer.itemId];
    if (!item || !getOwnedFurnitureItems().some((x) => x.id === item.id)) {
      setFurnitureOfferOpen(false);
      setFurnitureSellOffer(null);
      return;
    }

    const { price, pctLabel, itemName, originalCost, itemId } = furnitureSellOffer;

    if (selectedApartment?.id === LIVE_WITH_PARENTS_ID) {
      furnitureOfferClosedByAcceptRef.current = true;
      setFurnitureOfferOpen(false);
      setFurnitureSellOffer(null);
      advanceTime(
        { happiness: LIVING_WITH_PARENTS_BLOCK_FURNITURE_SELL_HAPPINESS },
        `You tried to close the deal on your ${itemName} for $${formatMoney(price)} — your parents caught you at the door and shut it down. "This is our home, not a flea market!" You're mortified. Happiness ${LIVING_WITH_PARENTS_BLOCK_FURNITURE_SELL_HAPPINESS}.`,
        0
      );
      return;
    }

    furnitureOfferClosedByAcceptRef.current = true;
    setFurnitureOfferOpen(false);
    setFurnitureSellOffer(null);

    let spoilOverride: SpoilageOverrides | undefined;

    if (item.category === 'fridge') {
      spoilHoursBankRef.current = 0;
      setHomeFurniture((prev) => (prev.fridgeId === itemId ? { ...prev, fridgeId: null } : prev));
      const merged = rebalanceGroceriesToFridge(groceryBuckets.fridge, groceryBuckets.counter, 0);
      setGroceryBuckets(merged);
      setGroceryFreshness((f) => ({
        regular: merged.counter.regular > 0 ? f.regular : 100,
        lux: merged.counter.lux > 0 ? f.lux : 100,
      }));
      spoilOverride = { groceryBuckets: merged };
    } else {
      setHomeFurniture((prev) => {
        if (item.category === 'decoration') {
          return { ...prev, decorationIds: prev.decorationIds.filter((d) => d !== itemId) };
        }
        if (item.category === 'bed' && prev.bedId === itemId) return { ...prev, bedId: null };
        if (item.category === 'stove' && prev.stoveId === itemId) return { ...prev, stoveId: null };
        if (item.category === 'tv' && prev.tvId === itemId) return { ...prev, tvId: null };
        return prev;
      });
    }

    advanceTime(
      { money: price },
      item.category === 'fridge'
        ? `You sold your ${itemName} for $${formatMoney(price)} (${pctLabel}% of the original $${formatMoney(originalCost)}). Food that was in the fridge moved to the counter.`
        : `You sold your ${itemName} for $${formatMoney(price)} (${pctLabel}% of the original $${formatMoney(originalCost)}).`,
      0,
      undefined,
      spoilOverride
    );
  };

  const snackSpaceUsed = getUsedSnackSpace(snackCounts);
  const backpackSpaceUsed = getUsedBackpackSpace(snackCounts, togoCarried);
  const backpackCapacity = getBackpackCapacity(backpackId);

  const buyBackpack = (id: BackpackId) => {
    const bp = BACKPACK_BY_ID[id];
    if (!bp || stats.money < bp.cost) return;
    if (backpackSpaceUsed > bp.capacity) {
      setEventLog((prev) => [
        {
          id: Date.now(),
          text: `Your items won't fit in that backpack (${backpackSpaceUsed} space used, only ${bp.capacity} available). Eat snacks or drop to-go meals first.`,
          timestamp: formatTimestamp(stats.year, stats.dayOfYear, stats.hourOfDay),
          effects: {},
        },
        ...prev,
      ]);
      return;
    }
    setBackpackId(id);
    advanceTime({ money: -bp.cost }, `You bought ${bp.name} (${bp.capacity} space units).`, 0.25);
  };

  const buySnack = (snackId: SnackId) => {
    const s = SNACK_BY_ID[snackId];
    if (!s || stats.money < s.cost) return;
    const cap = getBackpackCapacity(backpackId);
    if (cap <= 0) {
      setEventLog((prev) => [
        {
          id: Date.now(),
          text: 'Buy a backpack at the grocery store before you can carry snacks.',
          timestamp: formatTimestamp(stats.year, stats.dayOfYear, stats.hourOfDay),
          effects: {},
        },
        ...prev,
      ]);
      return;
    }
    if (backpackSpaceUsed + s.spaceUnits > cap) {
      setEventLog((prev) => [
        {
          id: Date.now(),
          text: `Not enough backpack space (${backpackSpaceUsed}/${cap} space used).`,
          timestamp: formatTimestamp(stats.year, stats.dayOfYear, stats.hourOfDay),
          effects: {},
        },
        ...prev,
      ]);
      return;
    }
    setSnackCounts((prev) => ({ ...prev, [snackId]: prev[snackId] + 1 }));
    advanceTime(
      { money: -s.cost },
      `You bought ${s.label} (+${s.hunger} hunger, ${s.spaceUnits} space).`,
      0.1
    );
  };

  const eatSnack = (snackId: SnackId) => {
    const s = SNACK_BY_ID[snackId];
    if (!s || (snackCounts[snackId] ?? 0) <= 0) return;
    setSnackCounts((prev) => ({ ...prev, [snackId]: Math.max(0, prev[snackId] - 1) }));
    bumpWorkBreakCreditIfBeforeFirstShift(EAT_SNACK_HOURS);
    advanceTime(
      { hunger: s.hunger },
      `You ate ${s.label} (${fmt2(EAT_SNACK_HOURS)} hr). Hunger +${s.hunger}.`,
      EAT_SNACK_HOURS
    );
  };

  const eatWorkCafeteriaMeal = (hunger: number, cost: number, eatHours: number, label: string) => {
    if (gamePhase !== 'work' || stats.money < cost) return;
    if (!canWorkNow() && !canWorkOvertimeNow()) return;
    bumpWorkBreakCreditIfBeforeFirstShift(eatHours);
    advanceTime(
      { money: -cost, hunger },
      `Work cafeteria: ${label}. Hunger +${hunger}, −$${formatMoney(cost)} (${fmt2(eatHours)} hr).`,
      eatHours
    );
  };

  const resetGame = () => {
    setStage('intro');
    setIntroRevealStarted(false);
    setCharacterFirstName('');
    setCharacterLastName('');
    setCharacterGender('girl');
    setSelectedCharacter(null);
    setActivityCount(0);
    setEventLog([]);
    setEducationLevel('none');
    setEducationDegree(null);
    setEducationProgress(0);
    setRentOverdue(false);
    setRentOverdueSinceDay(0);
    setLastRentPaidSeasonEndDay(null);
    setGroceryBuckets(EMPTY_GROCERY_BUCKETS);
    setGroceryFreshness({ regular: 100, lux: 100 });
    setSkincareDoses(emptySkincareDoses());
    setLastHaircutYear(null);
    setLastHaircutDayOfYear(null);
    setTogoHome({ regular: 0, lux: 0 });
    setTogoFreshHome({ regular: 100, lux: 100 });
    setTogoCarried({ regular: 0, lux: 0 });
    setTogoFreshCarried({ regular: 100, lux: 100 });
    spoilHoursBankRef.current = 0;
    setBackpackId(null);
    setSnackCounts({ ...EMPTY_SNACK_COUNTS });
    setHomeFurniture(EMPTY_HOME_FURNITURE);
    setJobSchedule('full-time');
    setWorkShiftStarted(null);
    workBreakCreditRef.current = { year: 0, dayOfYear: 0, hours: 0 };
    depletionHoursAccumRef.current = 0;
    setPendingLeaveWork(null);
    leaveWorkDialogShownForDayRef.current = null;
    setNpcInteractions(emptyNpcInteractions());
    setNpcRelationshipLastBumpDay(emptyNpcRelationshipLastBumpDay());
    setDatingPartnerId(null);
    setSchoolOnboardingPhase('tutorial');
  };

  const getLifeSummary = () => {
    const avgStat = (stats.health + stats.happiness + stats.money) / 3;
    if (avgStat >= 70) return 'You lived a fulfilling and balanced life! 🌟';
    if (avgStat >= 50) return 'You had your ups and downs, but lived life your way. 💫';
    if (avgStat >= 30) return 'Life was challenging, but you made it through. 💪';
    return 'Life was tough, but every experience shaped who you became. 🌱';
  };

  if (stage === 'intro') {
    const introMenuBg = '/assets/backgrounds/menusScreenMerlion.png';
    const introEnterEase = [0.22, 1, 0.36, 1] as const;
    const introExitEase = [0.4, 0, 1, 1] as const;

    const revealIntroWelcomeFull = () => {
      introWelcomeTyping.skipTyping();
    };

    const handleIntroEnterMenu = async () => {
      introWelcomeTyping.skipTyping();
      await unlockMenuAudio();
      try {
        playMenuEnterSound();
      } catch {
        /* Web Audio unavailable */
      }
      setIntroRevealStarted(true);
    };

    const nameKeyExtendsPastMax = (e: React.KeyboardEvent, len: number) => {
      if (len < CHARACTER_NAME_MAX) return false;
      if (e.ctrlKey || e.metaKey || e.altKey) return false;
      if (e.key === 'Backspace' || e.key === 'Delete') return false;
      if (e.key.length !== 1) return false;
      return true;
    };

    const handleIntroStartRequest = () => {
      if (
        !characterFirstName.trim() ||
        !characterLastName.trim() ||
        !selectedCharacter ||
        introStartExitLockRef.current
      )
        return;
      introStartExitLockRef.current = true;
      void unlockMenuAudio().then(() => {
        try {
          playMenuExitSound();
        } catch {
          /* ignore */
        }
      });
      setIntroMenuVisible(false);
    };

    return (
      <AnimatePresence
        mode="wait"
        onExitComplete={() => {
          if (stage === 'intro') {
            startGame();
          }
        }}
      >
        {introMenuVisible && (
          <motion.div
            key="intro-menu"
            className="relative min-h-screen flex items-center justify-center p-4"
            role="presentation"
            exit={{ opacity: 0, transition: { duration: 1.05, ease: introExitEase } }}
          >
            {/* Merlion + tint always visible behind Play overlay and menu card */}
            <div className="absolute inset-0" aria-hidden>
              <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: `url(${introMenuBg})` }}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-slate-900/35 via-slate-900/25 to-slate-900/45" />
            </div>
            <motion.div
              className={`relative z-10 w-full flex justify-center max-w-4xl ${!introRevealStarted ? 'pointer-events-none' : ''}`}
              initial={{ opacity: 0, y: 32 }}
              animate={
                introRevealStarted
                  ? { opacity: 1, y: 0 }
                  : { opacity: 0, y: 32 }
              }
              exit={{ opacity: 0, y: 18, transition: { duration: 0.9, ease: introExitEase } }}
              transition={{
                duration: INTRO_MENU_FADE_DURATION_SEC,
                delay: introRevealStarted ? INTRO_MENU_FADE_DELAY_SEC : 0,
                ease: introEnterEase,
              }}
            >
          <Card className="max-w-4xl w-full rounded-none border-4 border-[#1a2332] bg-[#d8e0eb] text-slate-900 shadow-[8px_8px_0_0_rgba(15,23,42,0.88)] font-pixel-ui text-xl leading-snug">
            <CardHeader className="text-center border-b-4 border-[#1a2332] bg-[linear-gradient(180deg,#b9c6d8_0%,#a8b6cc_100%)] px-4 py-5 sm:px-6">
              <div className="flex justify-center mb-3" aria-hidden>
                <span className="font-pixel-title text-2xl ">
                  
                </span>
              </div>
              <CardTitle className="font-pixel-title text-slate-900 flex items-center justify-center gap-3">
                <span>Choose your starting life path</span>
              </CardTitle>
            </CardHeader>
            <CardContent
              className={`gap-6 pb-6 ${
                selectedCharacter
                  ? 'grid md:grid-cols-[1fr_1.25fr] items-stretch'
                  : 'items-start'
              }`}
            >
              <div className="space-y-4 min-w-0 w-full max-w-xl mx-auto md:max-w-none flex flex-col h-full">
                <div className="flex flex-col flex-1 min-h-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex rounded-none border-[3px] border-[#1a2332] bg-[#eef2f8] p-0 shadow-[3px_3px_0_0_rgba(30,41,59,0.65)]">
                      <Button
                        type="button"
                        variant={characterGender === 'girl' ? 'default' : 'ghost'}
                        size="sm"
                        className={`h-10 px-4 text-xl rounded-none border-0 font-pixel-ui ${
                          characterGender === 'girl' ? '' : 'text-slate-800 hover:bg-slate-300/70'
                        }`}
                        onClick={() => setCharacterGender('girl')}
                      >
                        Girl
                      </Button>
                      <Button
                        type="button"
                        variant={characterGender === 'boy' ? 'default' : 'ghost'}
                        size="sm"
                        className={`h-10 px-4 text-xl rounded-none border-0 border-l-[3px] border-[#1a2332] font-pixel-ui ${
                          characterGender === 'boy' ? '' : 'text-slate-800 hover:bg-slate-300/70'
                        }`}
                        onClick={() => setCharacterGender('boy')}
                      >
                        Boy
                      </Button>
                    </div>
                  </div>
                  <div className="mt-2 h-[3px] w-full bg-slate-400/70" aria-hidden />
                  <div className="flex-1 min-h-0 flex flex-col justify-center">
                    <div className="grid grid-cols-1 gap-6">
                      {CHARACTER_PRESETS.map((preset) => {
                        const thumb =
                          preset.id === 'privileged' || preset.id === 'middle' || preset.id === 'struggling'
                            ? getCharacterPortraitUrl(
                                preset.id as PortraitPresetId,
                                characterGender,
                                'south'
                              )
                            : null;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => setSelectedCharacter(preset)}
                            className={`flex gap-3 items-start text-left rounded-none border-[3px] px-3 py-3 text-lg transition-[transform,box-shadow] active:translate-x-0.5 active:translate-y-0.5 ${
                              selectedCharacter?.id === preset.id
                                ? 'border-sky-800 bg-sky-100/95 shadow-[4px_4px_0_0_#075985] ring-0'
                                : 'border-[#1a2332] bg-[#eef2f8] shadow-[4px_4px_0_0_rgba(30,41,59,0.6)] hover:bg-slate-50'
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
                                className="w-16 h-16 sm:w-20 sm:h-20 rounded-none object-contain object-center flex-shrink-0 border-2 border-slate-500/60 shadow-none [image-rendering:pixelated]"
                                aria-hidden
                              />
                            ) : null}
                            <div className="min-w-0 flex-1">
                              <div className="font-pixel-title text-[0.65rem] sm:text-xs mb-1 text-slate-900">
                                {preset.name}
                              </div>
                              <div className="text-slate-700 text-base">{preset.description}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
                {selectedCharacter && (
                  <div className="mt-auto">
                    <motion.div
                      className="mt-2 space-y-4 pt-3 border-t-[3px] border-slate-400"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, ease: 'easeOut' }}
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label
                            htmlFor="first-name"
                            className="font-pixel-title text-[0.65rem] sm:text-xs mb-2 block text-slate-900 uppercase tracking-wide"
                          >
                            First name
                          </label>
                          <input
                            id="first-name"
                            type="text"
                            value={characterFirstName}
                            maxLength={CHARACTER_NAME_MAX}
                            onChange={(e) => {
                              const v = e.target.value.slice(0, CHARACTER_NAME_MAX);
                              setCharacterFirstName(v);
                              if (v.length < CHARACTER_NAME_MAX) setNameMaxHintFirst(false);
                            }}
                            onKeyDown={(e) => {
                              if (nameKeyExtendsPastMax(e, characterFirstName.length)) setNameMaxHintFirst(true);
                            }}
                            placeholder="First name"
                            autoComplete="given-name"
                            className="w-full px-3 py-2 rounded-none border-[3px] border-[#1a2332] bg-[#f4f7fc] font-pixel-ui text-xl sm:text-2xl focus:outline-none focus:ring-0 focus:border-sky-600 placeholder:text-slate-400"
                          />
                          {nameMaxHintFirst && (
                            <p className="text-[10px] text-amber-700 mt-1 font-pixel-ui motion-safe:animate-pulse">
                              Max {CHARACTER_NAME_MAX} characters
                            </p>
                          )}
                        </div>
                        <div>
                          <label
                            htmlFor="last-name"
                            className="font-pixel-title text-[0.65rem] sm:text-xs mb-2 block text-slate-900 uppercase tracking-wide"
                          >
                            Last name
                          </label>
                          <input
                            id="last-name"
                            type="text"
                            value={characterLastName}
                            maxLength={CHARACTER_NAME_MAX}
                            onChange={(e) => {
                              const v = e.target.value.slice(0, CHARACTER_NAME_MAX);
                              setCharacterLastName(v);
                              if (v.length < CHARACTER_NAME_MAX) setNameMaxHintLast(false);
                            }}
                            onKeyDown={(e) => {
                              if (nameKeyExtendsPastMax(e, characterLastName.length)) setNameMaxHintLast(true);
                            }}
                            placeholder="Last name"
                            autoComplete="family-name"
                            className="w-full px-3 py-2 rounded-none border-[3px] border-[#1a2332] bg-[#f4f7fc] font-pixel-ui text-xl sm:text-2xl focus:outline-none focus:ring-0 focus:border-sky-600 placeholder:text-slate-400"
                          />
                          {nameMaxHintLast && (
                            <p className="text-[10px] text-amber-700 mt-1 font-pixel-ui motion-safe:animate-pulse">
                              Max {CHARACTER_NAME_MAX} characters
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        onClick={handleIntroStartRequest}
                        disabled={!characterFirstName.trim() || !characterLastName.trim()}
                        className="w-full rounded-none border-[3px] border-[#1a2332] bg-gradient-to-r from-slate-700 via-sky-700 to-cyan-600 hover:from-slate-800 hover:via-sky-800 hover:to-cyan-700 font-pixel-title text-[0.65rem] sm:text-xs py-6 text-white shadow-[5px_5px_0_0_#0f172a] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[3px_3px_0_0_#0f172a] disabled:opacity-50"
                        size="lg"
                      >
                        Start Your Life Journey
                      </Button>
                    </motion.div>
                  </div>
                )}
              </div>
              {selectedCharacter && (
                <motion.div
                  className="md:sticky md:top-4 rounded-none border-[3px] border-[#1a2332] bg-[linear-gradient(145deg,#c5d0e0_0%,#b4c2d6_100%)] p-3 shadow-[4px_4px_0_0_rgba(30,41,59,0.65)]"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.35, delay: 0.05, ease: 'easeOut' }}
                >
                  <p className="text-center font-pixel-title text-[0.55rem] sm:text-[0.65rem] text-slate-900 uppercase tracking-wide mb-2">
                    Character view
                  </p>
                  <CharacterPortrait
                    variant="intro"
                    presetId={selectedCharacter?.id ?? null}
                    gender={characterGender}
                    name={characterDisplayName || 'Your sim'}
                    subtitle={selectedCharacter?.name ?? undefined}
                  />
                  <div className="mt-3 border-t-2 border-slate-700/30 pt-3 text-slate-900">
                    <div className="font-pixel-title text-[0.6rem] sm:text-[0.7rem] uppercase tracking-wide text-slate-900 mb-2 text-center">
                      Starting stats
                    </div>
                    <div className="text-[0.95rem] sm:text-base space-y-2">
                      <div className="text-center text-slate-800">
                        Points: <span className="font-semibold tabular-nums">{introPointsRemaining}</span> /{' '}
                        <span className="font-semibold tabular-nums">{introPointBudget}</span> remaining
                      </div>
                      <div className="text-center">
                        Money: ${selectedCharacter.startingMoney.toLocaleString()}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        <div className="space-y-1">
                          <StatScaleTooltip stat="beauty" side="bottom">
                            <div className="flex items-center justify-between gap-2 cursor-help text-slate-900">
                              <span className="font-medium">Beauty</span>
                              <span className="font-semibold tabular-nums">{fmtStatOutOfTen(introStatAlloc.beauty)}</span>
                            </div>
                          </StatScaleTooltip>
                          <Slider
                            value={[introStatAlloc.beauty]}
                            min={0}
                            max={10}
                            step={1}
                            onValueChange={(v) => setIntroAllocStat('beauty', v[0] ?? 0)}
                            className="!h-5 [&_[data-slot=slider-track]]:!h-3 [&_[data-slot=slider-range]]:!bg-rose-500 [&_[data-slot=slider-thumb]]:!size-5 [&_[data-slot=slider-thumb]]:!border-rose-600"
                          />
                        </div>

                        <div className="space-y-1">
                          <StatScaleTooltip stat="smarts" side="bottom">
                            <div className="flex items-center justify-between gap-2 cursor-help text-slate-900">
                              <span className="font-medium">Smarts</span>
                              <span className="font-semibold tabular-nums">{fmtStatOutOfTen(introStatAlloc.smarts)}</span>
                            </div>
                          </StatScaleTooltip>
                          <Slider
                            value={[introStatAlloc.smarts]}
                            min={0}
                            max={10}
                            step={1}
                            onValueChange={(v) => setIntroAllocStat('smarts', v[0] ?? 0)}
                            className="!h-5 [&_[data-slot=slider-track]]:!h-3 [&_[data-slot=slider-range]]:!bg-indigo-500 [&_[data-slot=slider-thumb]]:!size-5 [&_[data-slot=slider-thumb]]:!border-indigo-600"
                          />
                        </div>

                        <div className="space-y-1">
                          <StatScaleTooltip stat="fitness" side="bottom">
                            <div className="flex items-center justify-between gap-2 cursor-help text-slate-900">
                              <span className="font-medium">Fitness</span>
                              <span className="font-semibold tabular-nums">{fmtStatOutOfTen(introStatAlloc.fitness)}</span>
                            </div>
                          </StatScaleTooltip>
                          <Slider
                            value={[introStatAlloc.fitness]}
                            min={0}
                            max={10}
                            step={1}
                            onValueChange={(v) => setIntroAllocStat('fitness', v[0] ?? 0)}
                            className="!h-5 [&_[data-slot=slider-track]]:!h-3 [&_[data-slot=slider-range]]:!bg-emerald-500 [&_[data-slot=slider-thumb]]:!size-5 [&_[data-slot=slider-thumb]]:!border-emerald-600"
                          />
                        </div>

                        <div className="space-y-1">
                          <StatScaleTooltip stat="social" side="bottom">
                            <div className="flex items-center justify-between gap-2 cursor-help text-slate-900">
                              <span className="font-medium">Social</span>
                              <span className="font-semibold tabular-nums">{fmtStatOutOfTen(introStatAlloc.social)}</span>
                            </div>
                          </StatScaleTooltip>
                          <Slider
                            value={[introStatAlloc.social]}
                            min={0}
                            max={10}
                            step={1}
                            onValueChange={(v) => setIntroAllocStat('social', v[0] ?? 0)}
                            className="!h-5 [&_[data-slot=slider-track]]:!h-3 [&_[data-slot=slider-range]]:!bg-sky-500 [&_[data-slot=slider-thumb]]:!size-5 [&_[data-slot=slider-thumb]]:!border-sky-600"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </CardContent>
          </Card>
            </motion.div>
            {!introRevealStarted && (
              <div
                className={`absolute inset-0 z-[60] flex flex-col items-center justify-center gap-6 px-6 bg-black select-none ${
                  introWelcomeLineStarted ? 'cursor-pointer' : 'cursor-default'
                }`}
                onClick={introWelcomeLineStarted ? revealIntroWelcomeFull : undefined}
                role={introWelcomeLineStarted ? 'button' : undefined}
                aria-label={introWelcomeLineStarted ? 'Tap to show full welcome text' : undefined}
              >
                {introWelcomeLineStarted ? (
                  <p
                    className="font-pixel-ui text-slate-100 text-center text-2xl sm:text-3xl max-w-xl leading-snug min-h-[4.5rem]"
                    aria-live="polite"
                  >
                    {introWelcomeTyping.displayed}
                    {introWelcomeTyping.showCaret ? (
                      <span
                        className="inline-block w-[3px] h-[1.1em] ml-1 [vertical-align:-0.12em] bg-slate-200 motion-safe:animate-pulse"
                        aria-hidden
                      />
                    ) : null}
                  </p>
                ) : null}
                {!introWelcomeLineStarted ? (
                  <Button
                    type="button"
                    size="lg"
                    className="h-16 min-w-[12rem] rounded-none border-[3px] border-[#1a2332] font-pixel-title text-xs sm:text-sm text-white shadow-[6px_6px_0_0_rgba(15,23,42,0.65)] bg-gradient-to-r from-slate-600 via-sky-600 to-cyan-500 hover:from-slate-700 hover:via-sky-700 hover:to-cyan-600 active:translate-x-0.5 active:translate-y-0.5 active:shadow-[4px_4px_0_0_rgba(15,23,42,0.55)]"
                    onClick={(e) => {
                      e.stopPropagation();
                      beginIntroWelcomeLineTyping();
                    }}
                  >
                    <CirclePlay className="size-6 mr-2 shrink-0" aria-hidden />
                    Play
                  </Button>
                ) : introWelcomeTyping.typingDone ? (
                  <Button
                    type="button"
                    size="lg"
                    className="h-16 min-w-[12rem] rounded-none border-[3px] border-[#1a2332] font-pixel-title text-xs sm:text-sm text-white shadow-[6px_6px_0_0_rgba(15,23,42,0.65)] bg-gradient-to-r from-slate-700 via-emerald-700 to-teal-600 hover:from-slate-800 hover:via-emerald-800 hover:to-teal-700 active:translate-x-0.5 active:translate-y-0.5 active:shadow-[4px_4px_0_0_rgba(15,23,42,0.55)]"
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleIntroEnterMenu();
                    }}
                  >
                    <ArrowRight className="size-6 mr-2 shrink-0" aria-hidden />
                    Enter
                  </Button>
                ) : null}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
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
                Here&apos;s how {characterDisplayName || 'your sim'}&apos;s life unfolded...
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
                    <span className="font-bold">{intStat(stats.health)}%</span>
                  </div>
                  <Progress value={stats.health} className="h-3" />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Smile className="size-5 text-yellow-500" />
                      <span className="font-medium">Happiness</span>
                    </div>
                    <span className="font-bold">{intStat(stats.happiness)}%</span>
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
    <div
      className="h-screen flex flex-col overflow-hidden relative"
      style={getSeasonShellBackgroundStyle(stats.dayOfYear)}
    >
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{ background: `rgba(0,0,0,${getTimeOverlayAlpha(stats.hourOfDay)})` }}
        aria-hidden
      />
      <AnimatePresence>
        {seasonBanner && stage === 'playing' && (
          <motion.div
            key={seasonBanner}
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, scale: 0.88, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.04, y: -10 }}
            transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            className="pointer-events-none fixed left-1/2 top-[14%] z-[200] -translate-x-1/2 px-4"
          >
            <div className="rounded-2xl border-2 border-white/70 bg-white/92 px-7 py-3.5 text-center shadow-lg backdrop-blur-md">
              <div className="text-4xl leading-none mb-1.5 motion-safe:animate-bounce">
                {SEASON_CELEBRATE_EMOJI[seasonBanner]}
              </div>
              <div className="text-lg font-semibold text-stone-800">
                {seasonBanner} is here!
              </div>
              <div className="text-xs text-stone-500 mt-0.5 flex items-center justify-center gap-1">
                <Sparkles className="size-3.5 shrink-0 text-amber-500" />
                A fresh season begins
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {stage === 'playing' && devCheatsPortalTarget
        ? (createPortal(
            <Card className="flex-shrink-0 border-amber-200 bg-amber-50/50 shadow-md">
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
                  <label className="flex items-center gap-1">
                    <span className="w-14 shrink-0">Fitness</span>
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      max={10}
                      value={devForm.fitness}
                      onChange={(e) => setDevForm((f) => ({ ...f, fitness: e.target.value }))}
                      className="h-6 text-[11px] py-0"
                    />
                  </label>
                  <label className="flex items-center gap-1">
                    <span className="w-14 shrink-0">Social</span>
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      max={10}
                      value={devForm.social}
                      onChange={(e) => setDevForm((f) => ({ ...f, social: e.target.value }))}
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
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-[10px] border-slate-400"
                    onClick={passOneHour}
                    title="Advance in-game time by 1 hour (hunger, energy, etc.)"
                  >
                    Pass 1 Hr
                  </Button>
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
                    Simulate next 'real' time day
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
          </Card>,
          devCheatsPortalTarget
        ) as unknown as React.ReactNode)
        : null}
      <div className="relative z-10 flex flex-col flex-1 min-h-0 overflow-hidden p-2">
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
      <Dialog open={workRiskDialog != null} onOpenChange={(open) => !open && setWorkRiskDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Not enough energy</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  You have <span className="font-semibold text-foreground">{stats.energy.toFixed(0)}</span> energy, but
                  this work would use about{' '}
                  <span className="font-semibold text-foreground">{workRiskDialog?.energyCost.toFixed(0) ?? '—'}</span>.
                  Your energy would drop to zero and you may pass out.
                </p>
                <p>
                  Estimated pass-out chance if you continue:{' '}
                  <span className="font-semibold text-foreground">
                    {workRiskDialog ? `${(workRiskDialog.passOutChance * 100).toFixed(0)}%` : '—'}
                  </span>{' '}
                  (capped at 90%; based on hours vs energy left).
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setWorkRiskDialog(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!workRiskDialog) return;
                const d = workRiskDialog;
                setWorkRiskDialog(null);
                workShift(d.overtimeHours, d.intensity, d.requestedHours, { skipRiskConfirm: true });
              }}
            >
              Continue anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={pendingLeaveWork != null}
        onOpenChange={(open) => {
          if (!open) cancelLeaveWork();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Leave workplace?</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  Leaving during your <span className="font-medium text-foreground">regular shift</span> (before your
                  scheduled end time) costs{' '}
                  <span className="font-semibold text-foreground">{LEAVE_WORK_PERFORMANCE_PENALTY} job performance</span>{' '}
                  points (similar to showing up late once).
                </p>
                <p>
                  Optional overtime after your shift is voluntary — you are not penalized for leaving during the overtime
                  window.
                </p>
                <p>Stay if you want to keep working or use the cafeteria without this penalty.</p>
                <p className="text-[11px] pt-1">
                  This reminder shows at most once per in-game day. If you leave again later the same day during regular
                  hours, performance still drops each time.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={cancelLeaveWork}>
              Stay at work
            </Button>
            <Button variant="destructive" onClick={confirmLeaveWork}>
              Leave anyway (−{LEAVE_WORK_PERFORMANCE_PENALTY} performance)
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
              <span className="font-semibold">Money:</span> ${formatMoney(stats.money)}
            </div>
            <div>
              <span className="font-semibold">Groceries:</span> {groceries.regular} regular meals, {groceries.lux} luxury meals
            </div>
            <div>
              <span className="font-semibold">Backpack:</span>{' '}
              {backpackId ? `${BACKPACK_BY_ID[backpackId].name} (${backpackCapacity} space)` : 'None'}
            </div>
            <div>
              <span className="font-semibold">Backpack used:</span>{' '}
              {backpackSpaceUsed}/{backpackCapacity || 0} space (snacks + to-go meals)
            </div>
            <div>
              <span className="font-semibold">Snacks carried:</span>{' '}
              {snackSpaceUsed} snack space ·{' '}
              {SNACK_TYPES.map((s) => `${s.label} ×${snackCounts[s.id] ?? 0}`).join(' · ')}
            </div>
            {gamePhase === 'home' && (togoHome.regular > 0 || togoHome.lux > 0) && (
              <div className="space-y-1 border border-amber-200/80 rounded-md p-2 bg-amber-50/50">
                <div className="font-semibold">Packed to-go (at home — stash into backpack)</div>
                <div className="text-xs text-gray-600">
                  Stash only from home. Freshness regular {clampFreshnessPct(togoFreshHome.regular)}% · luxury{' '}
                  {clampFreshnessPct(togoFreshHome.lux)}% ({TOGO_MEAL_SPACE_UNITS} space each).
                </div>
                <div className="flex flex-wrap gap-2">
                  {(() => {
                    const canStash =
                      backpackCapacity > 0 &&
                      backpackSpaceUsed + TOGO_MEAL_SPACE_UNITS <= backpackCapacity;
                    const stashTitle = !canStash
                      ? backpackCapacity <= 0
                        ? 'Buy a backpack first'
                        : `Backpack full — need ${TOGO_MEAL_SPACE_UNITS} free space (${backpackSpaceUsed}/${backpackCapacity})`
                      : undefined;
                    return (
                      <>
                        {togoHome.regular > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!canStash}
                            title={stashTitle}
                            onClick={() => stashTogoInBackpack('regular')}
                          >
                            Stash packed regular ×{togoHome.regular}
                          </Button>
                        )}
                        {togoHome.lux > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!canStash}
                            title={stashTitle}
                            onClick={() => stashTogoInBackpack('lux')}
                          >
                            Stash packed luxury ×{togoHome.lux}
                          </Button>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            )}
            {gamePhase !== 'home' && (togoHome.regular > 0 || togoHome.lux > 0) && (
              <p className="text-xs text-amber-900/90">
                You have packed meals at home — go home to stash them in your backpack.
              </p>
            )}
            {(togoCarried.regular > 0 || togoCarried.lux > 0) && (
              <div className="space-y-1">
                <div className="font-semibold">To-go meals ({TOGO_MEAL_SPACE_UNITS} space each)</div>
                <div className="text-xs text-gray-600">
                  Freshness regular {togoFreshCarried.regular}% · luxury {togoFreshCarried.lux}% (spoils like pantry food)
                </div>
                <div className="flex flex-wrap gap-2">
                  {togoCarried.regular > 0 && (
                    <Button size="sm" variant="secondary" onClick={() => eatTogoFromBackpack('regular')}>
                      Eat regular to-go ×{togoCarried.regular} (no time)
                    </Button>
                  )}
                  {togoCarried.lux > 0 && (
                    <Button size="sm" variant="secondary" onClick={() => eatTogoFromBackpack('lux')}>
                      Eat luxury to-go ×{togoCarried.lux} (no time)
                    </Button>
                  )}
                </div>
              </div>
            )}
            {SNACK_TYPES.some((s) => (snackCounts[s.id] ?? 0) > 0) && (
              <div className="space-y-2 pt-1">
                <div className="font-semibold">
                  Eat snack (~{Math.round(EAT_SNACK_HOURS * 60)} min each)
                </div>
                <div className="flex flex-wrap gap-2">
                  {SNACK_TYPES.map((s) => {
                    const n = snackCounts[s.id] ?? 0;
                    if (n <= 0) return null;
                    return (
                      <Button
                        key={s.id}
                        size="sm"
                        variant="secondary"
                        onClick={() => eatSnack(s.id)}
                      >
                        {s.label} (+{s.hunger}) ×{n}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}
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
      <Dialog open={furnitureSellOpen} onOpenChange={setFurnitureSellOpen}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Sell furniture used</DialogTitle>
            <DialogDescription>
              Takes about <span className="font-medium">1 in-game hour</span> and costs some{' '}
              <span className="font-medium">hunger ({SELL_ATTEMPT_HUNGER})</span> and{' '}
              <span className="font-medium">energy ({SELL_ATTEMPT_ENERGY})</span>. There is a{' '}
              <span className="font-medium">50%</span> chance a buyer shows up. If they do, they offer{' '}
              <span className="font-medium">20%–80%</span> of the original price — you can accept or decline in the next
              step.
            </DialogDescription>
          </DialogHeader>
          <div className="text-sm space-y-2">
            {getOwnedFurnitureItems().length === 0 ? (
              <p className="text-gray-500 text-xs">You don&apos;t own any furniture to sell.</p>
            ) : (
              getOwnedFurnitureItems().map((item) => (
                <div
                  key={item.id}
                  className="flex gap-2 items-center justify-between p-2 rounded-lg border bg-stone-50/80 text-xs"
                >
                  <div className="min-w-0">
                    <span className="text-lg mr-1">{item.icon}</span>
                    <span className="font-medium">{item.name}</span>
                    <span className="text-gray-600 block">Paid ${item.cost.toLocaleString()}</span>
                  </div>
                  <Button size="sm" variant="secondary" className="shrink-0" onClick={() => trySellFurniture(item.id)}>
                    Sell (1 hr)
                  </Button>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFurnitureSellOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={furnitureOfferOpen}
        onOpenChange={(open) => {
          if (open) {
            setFurnitureOfferOpen(true);
            return;
          }
          if (furnitureOfferClosedByAcceptRef.current) {
            furnitureOfferClosedByAcceptRef.current = false;
            setFurnitureOfferOpen(false);
            return;
          }
          setFurnitureOfferOpen(false);
          setFurnitureSellOffer((curr) => {
            if (!curr) return null;
            const n = curr.itemName;
            setEventLog((prev) => [
              {
                id: Date.now(),
                text: `You turned down the buyer's offer for your ${n}.`,
                timestamp: formatTimestamp(stats.year, stats.dayOfYear, stats.hourOfDay),
                effects: {},
              },
              ...prev,
            ]);
            return null;
          });
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Buyer offer</DialogTitle>
            <DialogDescription>
              Someone wants to buy your furniture. You can accept their price or walk away.
            </DialogDescription>
          </DialogHeader>
          {furnitureSellOffer && (
            <div className="text-sm space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg border bg-stone-50/80">
                <span className="text-2xl">{furnitureSellOffer.icon}</span>
                <div>
                  <div className="font-medium">{furnitureSellOffer.itemName}</div>
                  <div className="text-gray-600 text-xs">
                    You paid ${furnitureSellOffer.originalCost.toLocaleString()} · offer is{' '}
                    <span className="font-semibold text-foreground">{furnitureSellOffer.pctLabel}%</span> of retail
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-center">
                <div className="text-xs text-gray-600 mb-0.5">Offer</div>
                <div className="text-xl font-semibold tabular-nums">${formatMoney(furnitureSellOffer.price)}</div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setFurnitureOfferOpen(false)}>
              Decline
            </Button>
            <Button onClick={() => acceptFurnitureOffer()}>Sell at this price</Button>
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
                <div>
                  📱 Rent is overdue. Pay by Sunday end of day or you will be evicted with no housing.
                </div>
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
      <Dialog
        open={DAILY_ACTIVITIES_ENABLED && dailyActivitiesOpen}
        onOpenChange={(open) => DAILY_ACTIVITIES_ENABLED && setDailyActivitiesOpen(open)}
      >
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
      <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col min-h-0 gap-2">
        {/* Main Content: Map and Event Log — flex-1 shrinks so bottom hub never overlaps */}
        <div className="grid md:grid-cols-3 gap-2 flex-1 min-h-0 min-w-0 overflow-hidden">
          {/* Map - Takes 2/3 of the space */}
          <div className="md:col-span-2 min-h-0 min-w-0 flex flex-col flex-1 overflow-hidden">
            <InteractiveMap
              stats={stats}
              onActivityComplete={handleMapActivity}
              gamePhase={gamePhase}
              apartments={APARTMENTS}
              jobs={JOBS}
              onSelectApartment={(apt) => {
                if (selectedApartment?.id === apt.id) return;
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
              onWorkShift={(intensity, hours) => workShift(0, intensity, hours)}
              onWorkOvertime={(intensity) => workShift(1, intensity)}
              workHoursPerShift={workHoursPerShift()}
              maxWorkHours={
                selectedJob
                  ? Math.max(1, Math.min(12, getHoursAvailableToWork(selectedJob, stats.hourOfDay)))
                  : 12
              }
              canWorkNow={canWorkNow()}
              canWorkOvertimeNow={canWorkOvertimeNow()}
              isFirstDayOfWork={selectedJob != null && !hasWaitedFirstDayForJob()}
              getSalaryPerDay={salaryPerDay}
              getSalaryPerHour={salaryPerHour}
              getEffectiveSalary={getEffectiveSalary}
              getCurrentJobTitle={getCurrentJobTitle}
              promotionCheck={{ ...canAskForPromotion(), chance: getPromotionChance() }}
              onAskForPromotion={askForPromotion}
              onCafeteriaMeal={eatWorkCafeteriaMeal}
              onGoToSchool={goToSchool}
              schoolCampusOpen={campusAccess.open}
              schoolCampusClosedReason={campusAccess.closedReason ?? ''}
              tuitionPaidCurrentSeason={tuitionPaidCurrentSeason}
              onChillAtSchool={chillAtSchool}
              onPublicNapAtSchool={publicNapAtSchool}
              onEatSchoolCafe={eatSchoolCafe}
              jobOfficeOpen={isJobOfficeOpen(stats.hourOfDay)}
              onQuitJob={quitJob}
              onGoToJobSelection={() => {
                if (!isJobOfficeOpen(stats.hourOfDay)) return;
                navigateTo('selecting-job');
              }}
              onGoToWork={() => navigateTo('work')}
              onGoToHomeSelection={() => navigateTo('selecting-home')}
              onGoToHome={() => navigateTo('home')}
              onGoToGym={(d) => navigateTo('gym', { gymDistrict: d })}
              onGoToPark={(district: DistrictName) => navigateTo('park', { parkDistrict: district })}
              onGoToGrocery={(district: DistrictName) => navigateTo('grocery', { groceryDistrict: district })}
              onGoToFurniture={(district: DistrictName) => navigateTo('furniture', { furnitureDistrict: district })}
              onGoToCityView={() => navigateTo('free-play')}
              onBuyGroceries={buyGroceries}
              onBuyFastFood={buyFastFood}
              backpackId={backpackId}
              snackCounts={snackCounts}
              togoCarried={togoCarried}
              backpackSpaceUsed={backpackSpaceUsed}
              backpackCapacity={backpackCapacity}
              fridgeGroceries={groceryBuckets.fridge}
              counterGroceries={groceryBuckets.counter}
              fridgeMealCapacity={getFridgeMealCapacity(homeFurniture.fridgeId)}
              togoHome={togoHome}
              togoFreshHome={togoFreshHome}
              onPrepareTogo={prepareTogoMeal}
              onStashTogo={stashTogoInBackpack}
              onBuyBackpack={buyBackpack}
              onBuySnack={buySnack}
              skincareDoses={skincareDoses}
              onBuySkincare={buySkincare}
              onGetHaircut={getHaircut}
              haircutSalon={haircutSalon}
              selectedApartment={selectedApartment}
              gymMembership={gymMembership}
              onSelectGymMembership={selectGymMembership}
              onGymWorkout={gymWorkout}
              onGymChill={gymChill}
              onBuyGymSnack={buySnackAtGym}
              onParkWalk={parkWalk}
              onSleep={sleep}
              onEatMeal={eatMeal}
              onEatSnack={eatSnack}
              onChill={chillAtHome}
              onWatchTv={watchTv}
              onBuyFurniture={buyFurniture}
              onOpenFurnitureSell={() => setFurnitureSellOpen(true)}
              homeFurniture={homeFurniture}
              groceryFreshness={groceryFreshness}
              hasFridge={hasFridge(homeFurniture)}
              watchHappinessPerHour={getWatchHappinessPerHour(homeFurniture)}
              isLiveWithParents={selectedApartment?.id === LIVE_WITH_PARENTS_ID}
              isHomeless={selectedApartment === null && gamePhase !== 'selecting-home'}
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
              furnitureDistrict={furnitureDistrict}
              gymDistrict={gymDistrict}
              getTravelMinutes={(target, destDistrict) =>
                getTravelMinutes(
                  gamePhase,
                  target,
                  selectedApartment?.district,
                  parkDistrict,
                  groceryDistrict,
                  furnitureDistrict,
                  target === 'park' ? destDistrict : undefined,
                  target === 'grocery' ? destDistrict : undefined,
                  target === 'furniture' ? destDistrict : undefined,
                  target === 'work' || gamePhase === 'work' ? selectedJob?.district : undefined,
                  gymDistrict,
                  target === 'gym' ? (destDistrict as 'Dewmist' | 'Semba' | 'Marina' | undefined) : undefined
                )
              }
              mapOverlayOpen={mapOverlayOpen}
              onCloseMapOverlay={() => setMapOverlayOpen(false)}
              pendingGoHomeAnimation={pendingGoHomeAnimation}
              onGoHomeAnimationDone={() => setPendingGoHomeAnimation(false)}
              pendingGoToSchoolAnimation={pendingGoToSchoolAnimation}
              onGoToSchoolAnimationDone={() => setPendingGoToSchoolAnimation(false)}
              onOpenMapOverlay={() => setMapOverlayOpen(true)}
              npcInteractions={npcInteractions}
              datingPartnerId={datingPartnerId}
              onTalkToNpc={talkToNpc}
              onStartDating={startDatingNpc}
              schoolTutorialOpen={schoolOnboardingPhase === 'tutorial'}
              onDismissSchoolTutorial={() =>
                setSchoolOnboardingPhase((p) => (p === 'tutorial' ? 'meet-classmates' : p))
              }
              schoolMeetClassmatesOpen={schoolOnboardingPhase === 'meet-classmates'}
              onDismissSchoolMeetClassmates={() =>
                setSchoolOnboardingPhase((p) => (p === 'meet-classmates' ? 'done' : p))
              }
            />
          </div>

          {/* Character view - right column; latest log at bottom, full log in dialog (dev cheats portaled under App “Show Game/Analysis”) */}
          <div className="md:col-span-1 min-h-0 min-w-0 flex flex-col gap-2 flex-1 overflow-hidden">
            <Card className={`${gameChromePanelMuted} flex flex-col flex-1 min-h-0`}>
              <CardHeader className={`flex-shrink-0 py-2 pb-1 px-3 ${gameChromePanelHeader}`}>
                <button
                  type="button"
                  onClick={() => setPlayerSkillsOpen(true)}
                  className="w-full min-w-0 text-left rounded-md px-1.5 py-0.5 -mx-1.5 -my-0.5 hover:bg-slate-200/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40 transition-colors"
                  aria-label="Open player skills"
                >
                  <span className="block text-sm font-semibold text-slate-900 truncate">
                    {characterDisplayName || 'Sim'}
                  </span>
                </button>
              </CardHeader>
              <CardContent className="flex-1 min-h-0 flex flex-col pt-0 pb-0 px-2">
                <div className="flex-1 min-h-0 flex items-stretch justify-center py-1 pb-2">
                  <CharacterPortrait
                    variant="panel"
                    presetId={selectedCharacter?.id ?? null}
                    gender={characterGender}
                    className="w-full max-w-[200px]"
                  />
                </div>
                <div className="flex-shrink-0 border-t border-slate-400/55 bg-slate-100/50 rounded-b-md px-2 py-2 -mx-0.5 mb-0.5">
                  <div className="flex items-center gap-1 mb-1">
                    <ScrollText className="size-3 text-sky-700 shrink-0" />
                    <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">
                      Latest
                    </span>
                  </div>
                  {eventLog.length === 0 ? (
                    <p className="text-[11px] text-slate-500 italic leading-snug">
                      No activities yet — open the map and visit a place.
                    </p>
                  ) : (
                    <>
                      {(() => {
                        const entry = eventLog[0];
                        return (
                          <div className="border-l-2 border-sky-600 pl-1.5 py-1 bg-sky-100/80 rounded-r">
                            <div className="text-[9px] font-semibold text-sky-900 mb-0.5">
                              {entry.timestamp}
                            </div>
                            <p className="text-[11px] text-slate-800 leading-snug line-clamp-4">{entry.text}</p>
                            <div className="flex gap-1 flex-wrap mt-1">
                              {entry.effects.health != null && entry.effects.health !== 0 && (
                                <span
                                  className={`text-[10px] px-1.5 py-0.5 rounded ${
                                    entry.effects.health > 0
                                      ? 'bg-red-100 text-red-700'
                                      : 'bg-red-200 text-red-800'
                                  }`}
                                >
                                  ❤️ {entry.effects.health > 0 ? '+' : ''}
                                  {intStat(Number(entry.effects.health))}
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
                                  {intStat(Number(entry.effects.happiness))}
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
                                  {intStat(Number(entry.effects.energy))}
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
                                  {intStat(Number(entry.effects.hunger))}
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
                                  {formatMoney(Number(entry.effects.money))}
                                </span>
                              )}
                              {entry.effects.beauty != null && entry.effects.beauty !== 0 && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-pink-100 text-pink-800">
                                  ✨ {entry.effects.beauty > 0 ? '+' : ''}
                                  {fmt2(Number(entry.effects.beauty))}
                                </span>
                              )}
                              {entry.effects.smarts != null && entry.effects.smarts !== 0 && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800">
                                  📚 {entry.effects.smarts > 0 ? '+' : ''}
                                  {fmt2(Number(entry.effects.smarts))}
                                </span>
                              )}
                              {entry.effects.fitness != null && entry.effects.fitness !== 0 && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                                  🏃 {entry.effects.fitness > 0 ? '+' : ''}
                                  {fmt2(Number(entry.effects.fitness))}
                                </span>
                              )}
                              {entry.effects.social != null && entry.effects.social !== 0 && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-100 text-sky-800">
                                  👥 {entry.effects.social > 0 ? '+' : ''}
                                  {fmt2(Number(entry.effects.social))}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                      {eventLog.length > 1 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 mt-1.5 w-full text-[10px] text-sky-800 hover:text-sky-900 hover:bg-sky-100/80"
                          onClick={() => setEventLogOpen(true)}
                        >
                          View full log ({eventLog.length} entries)
                        </Button>
                      ) : null}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            <Dialog open={eventLogOpen} onOpenChange={setEventLogOpen}>
              <DialogContent className="sm:max-w-lg max-h-[min(85vh,520px)] flex flex-col bg-white">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-base">
                    <ScrollText className="size-4 text-sky-700" />
                    Event log
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    Recent activities and stat changes (newest first).
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-1.5 flex-1 min-h-0 overflow-y-auto pr-1 text-[11px] -mx-1 px-1">
                  {eventLog.length === 0 ? (
                    <p className="text-[11px] text-slate-600 italic leading-snug py-2">
                      No activities yet — open the map and visit a place.
                    </p>
                  ) : (
                    eventLog.map((entry) => (
                      <motion.div
                        key={entry.id}
                        initial={{ opacity: 0, x: 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="border-l-2 border-sky-600 pl-1.5 py-0.5 bg-sky-100/80 rounded-r"
                      >
                        <div className="text-[9px] font-semibold text-sky-900 mb-0.5">
                          {entry.timestamp}
                        </div>
                        <p className="text-[11px] text-slate-800 mb-0.5 leading-snug">{entry.text}</p>
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
                              {intStat(Number(entry.effects.health))}
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
                              {intStat(Number(entry.effects.happiness))}
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
                              {intStat(Number(entry.effects.energy))}
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
                              {intStat(Number(entry.effects.hunger))}
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
                              {formatMoney(Number(entry.effects.money))}
                            </span>
                          )}
                          {entry.effects.beauty != null && entry.effects.beauty !== 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-pink-100 text-pink-800">
                              ✨ {entry.effects.beauty > 0 ? '+' : ''}
                              {fmt2(Number(entry.effects.beauty))}
                            </span>
                          )}
                          {entry.effects.smarts != null && entry.effects.smarts !== 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800">
                              📚 {entry.effects.smarts > 0 ? '+' : ''}
                              {fmt2(Number(entry.effects.smarts))}
                            </span>
                          )}
                          {entry.effects.fitness != null && entry.effects.fitness !== 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                              🏃 {entry.effects.fitness > 0 ? '+' : ''}
                              {fmt2(Number(entry.effects.fitness))}
                            </span>
                          )}
                          {entry.effects.social != null && entry.effects.social !== 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-100 text-sky-800">
                              👥 {entry.effects.social > 0 ? '+' : ''}
                              {fmt2(Number(entry.effects.social))}
                            </span>
                          )}
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setEventLogOpen(false)}>
                    Close
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog
              open={npcIntroOpen}
              onOpenChange={(open) => {
                if (!open) {
                  npcIntroCommitLockRef.current = false;
                  setNpcIntroOpen(false);
                  setNpcIntroNpcId(null);
                  setNpcIntroSubStep(0);
                }
              }}
            >
              <DialogContent
                overlayClassName="bg-slate-950/60 backdrop-blur-[2px]"
                className={storyBeatDialogContentClassName}
              >
                <DialogHeader className="sr-only">
                  <DialogTitle>First meet</DialogTitle>
                  <DialogDescription>
                    Step {npcIntroSubStep + 1} of {npcIntroSubStepsTotal}. {npcIntroBeatPhase === 'story' ? 'Story' : 'They speak'}.
                  </DialogDescription>
                </DialogHeader>
                <div className="mx-1 flex min-h-0 flex-1 flex-col sm:mx-2">
                  <div className="flex min-h-0 flex-1 flex-col rounded-sm border-4 border-[#5c3d2e] bg-[#2d1f14] p-2 shadow-[0_0_0_2px_#1a120c,8px_8px_0_0_rgba(0,0,0,0.45)] sm:p-3">
                    <div className="mb-2 flex shrink-0 items-center justify-between gap-2 pr-6">
                      <p className="font-pixel-title text-[0.45rem] sm:text-[0.5rem] uppercase tracking-widest text-[#e8dcc8]">
                        <Users className="inline size-3 mr-1.5 align-middle opacity-90" aria-hidden />
                        First meet
                      </p>
                      <span className="font-pixel-ui text-xs text-[#c9a87a] tabular-nums text-right leading-tight">
                        <span className="block">
                          {npcIntroSubStepsTotal > 0 ? npcIntroSubStep + 1 : 1} /{' '}
                          {npcIntroSubStepsTotal > 0 ? npcIntroSubStepsTotal : 1}
                        </span>
                        <span className="block opacity-80 normal-case">
                          {npcIntroBeatPhase === 'story' ? 'Story' : 'They speak'}
                        </span>
                      </span>
                    </div>
                    <div key={npcIntroSubStep} className="min-h-0 flex-1 overflow-hidden">
                      {npcIntroBeatPhase === 'story' ? (
                        <div
                          className="flex h-[200px] cursor-pointer flex-col rounded-sm border-4 border-[#4a3020] bg-[#e8dcc8] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] sm:h-[220px] sm:px-4"
                          onClick={npcIntroBeatTyping.skipTyping}
                          role="presentation"
                        >
                          <p className="font-pixel-title mb-1.5 shrink-0 text-[0.5rem] uppercase tracking-wider text-[#6b4423]">
                            What happens
                          </p>
                          <p
                            className="font-pixel-ui min-h-0 flex-1 overflow-y-auto text-base leading-snug text-[#3d2914] sm:text-lg sm:leading-snug"
                            aria-live="polite"
                          >
                            {npcIntroBeatTyping.displayed}
                            {npcIntroBeatTyping.showCaret ? (
                              <span
                                className="ml-0.5 inline-block h-[1.05em] w-[3px] [vertical-align:-0.12em] bg-[#3d2914] motion-safe:animate-pulse"
                                aria-hidden
                              />
                            ) : null}
                          </p>
                        </div>
                      ) : (
                        <div
                          className="flex h-[200px] w-full cursor-pointer flex-row border-4 border-[#4a3020] bg-[#3d2914] shadow-[inset_0_2px_0_rgba(255,255,255,0.08)] sm:h-[220px]"
                          onClick={npcIntroBeatTyping.skipTyping}
                          role="region"
                          aria-label={`${npcIntroProfile?.name ?? 'NPC'} is speaking`}
                        >
                          <div className="flex min-h-0 min-w-0 flex-1 flex-col border-r-4 border-[#4a3020] bg-[#fce3b4] p-2 sm:p-3">
                            <p
                              className="font-pixel-ui min-h-0 flex-1 overflow-y-auto text-base leading-relaxed text-[#3d2914] sm:text-lg"
                              aria-live="polite"
                            >
                              {npcIntroBeatTyping.displayed}
                              {npcIntroBeatTyping.showCaret ? (
                                <span
                                  className="ml-0.5 inline-block h-[1.05em] w-[3px] [vertical-align:-0.12em] bg-[#3d2914] motion-safe:animate-pulse"
                                  aria-hidden
                                />
                              ) : null}
                            </p>
                          </div>
                          <div className="flex w-[100px] shrink-0 flex-col justify-between bg-gradient-to-b from-[#6b4423] to-[#4a3020] p-1.5 sm:w-[38%] sm:max-w-[180px] sm:p-2">
                            <div
                              className="mx-auto aspect-square w-full max-w-[120px] border-[3px] border-[#c9a227] shadow-[inset_0_0_0_2px_rgba(0,0,0,0.25),0_2px_0_#2d1f14] flex items-center justify-center"
                              style={{
                                background: `linear-gradient(145deg, ${npcIntroBeat?.portraitFrom ?? '#7c3a5a'}, ${npcIntroBeat?.portraitTo ?? '#4a2040'})`,
                              }}
                            >
                              <span className="font-pixel-title text-2xl text-[#fce3b4] drop-shadow-[2px_2px_0_#1a120c] sm:text-3xl">
                                {npcIntroPortraitInitial}
                              </span>
                            </div>
                            <div className="mt-1.5 flex justify-center sm:mt-2">
                              <div className="w-full rounded-full border-2 border-[#5c3d2e] bg-[#fce3b4] px-1.5 py-1 text-center shadow-[0_2px_0_#2d1f14] sm:px-2 sm:py-1.5">
                                <span className="font-pixel-title text-[0.45rem] uppercase tracking-wide text-[#2d1f14] leading-tight line-clamp-2 sm:text-[0.5rem]">
                                  {npcIntroProfile?.name ?? 'NPC'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <DialogFooter className="mx-1 mt-2 flex h-12 shrink-0 flex-row items-center justify-end border-0 bg-transparent px-0 pb-2 sm:mx-2">
                  {!isLastNpcIntroStep ? (
                    <Button
                      type="button"
                      disabled={!npcIntroBeatTyping.typingDone}
                      className={cn(
                        'h-11 w-40 shrink-0 rounded-none border-[3px] border-[#4a3020] bg-gradient-to-b from-[#8b5a3c] to-[#5c3d2e] font-pixel-title text-[0.55rem] sm:text-[0.6rem] uppercase tracking-wide text-[#fce3b4] shadow-[4px_4px_0_#1a120c] hover:from-[#9d6a4a] hover:to-[#6b4423] disabled:opacity-100',
                        !npcIntroBeatTyping.typingDone && 'pointer-events-none invisible'
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        setNpcIntroSubStep((s) => Math.min(s + 1, npcIntroSubStepsTotal - 1));
                      }}
                    >
                      Next
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      disabled={!npcIntroBeatTyping.typingDone}
                      className={cn(
                        'h-11 w-40 shrink-0 rounded-none border-[3px] border-[#1a2332] bg-gradient-to-r from-slate-600 via-sky-600 to-cyan-500 font-pixel-title text-[0.55rem] sm:text-[0.6rem] uppercase tracking-wide text-white shadow-[4px_4px_0_#0f172a] disabled:opacity-100',
                        !npcIntroBeatTyping.typingDone && 'pointer-events-none invisible'
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!npcIntroNpcId) return;
                        if (npcIntroCommitLockRef.current) return;
                        npcIntroCommitLockRef.current = true;

                        if (npcIntroBeatPhase === 'dialogue') {
                          commitNpcTalk(npcIntroNpcId, { dialogueLineOverride: npcIntroBeat?.line });
                        } else {
                          commitNpcTalk(npcIntroNpcId);
                        }

                        setNpcIntroOpen(false);
                        setNpcIntroNpcId(null);
                        setNpcIntroSubStep(0);
                      }}
                    >
                      Continue
                    </Button>
                  )}
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog
              open={fullMoonEventOpen}
              onOpenChange={(open) => {
                if (!open) {
                  commitFullMoonMoment();
                  setFullMoonEventOpen(false);
                  setFullMoonEventKey(null);
                  setFullMoonSubStep(0);
                }
              }}
            >
              <DialogContent
                overlayClassName="bg-slate-950/60 backdrop-blur-[2px]"
                className={storyBeatDialogContentClassName}
              >
                <DialogHeader className="sr-only">
                  <DialogTitle>Full moon</DialogTitle>
                  <DialogDescription>
                    Step {fullMoonSubStep + 1} of {fullMoonSubStepsTotal}. {fullMoonBeatPhase === 'story' ? 'Story' : 'You think'}.
                  </DialogDescription>
                </DialogHeader>
                <div
                  className="mx-1 flex min-h-0 flex-1 flex-col sm:mx-2"
                  style={{ imageRendering: 'pixelated' }}
                >
                  <div className="flex min-h-0 flex-1 flex-col rounded-sm border-4 border-[#5c3d2e] bg-[#2d1f14] p-2 shadow-[0_0_0_2px_#1a120c,8px_8px_0_0_rgba(0,0,0,0.45)] sm:p-3">
                    <div className="mb-2 flex shrink-0 items-center justify-between gap-2 pr-6">
                      <p className="font-pixel-title text-[0.45rem] sm:text-[0.5rem] uppercase tracking-widest text-[#e8dcc8]">
                        <Sparkles className="inline size-3 mr-1.5 align-middle opacity-90" aria-hidden />
                        Full moon
                      </p>
                      <span className="font-pixel-ui text-xs text-[#c9a87a] tabular-nums text-right leading-tight">
                        <span className="block">
                          {fullMoonSubStep + 1} / {fullMoonSubStepsTotal}
                        </span>
                        <span className="block opacity-80 normal-case">
                          {fullMoonBeatPhase === 'story' ? 'Story' : 'A thought'}
                        </span>
                      </span>
                    </div>

                    <div key={fullMoonSubStep} className="min-h-0 flex-1 overflow-hidden">
                      {fullMoonBeatPhase === 'story' ? (
                        <div
                          className="flex h-[200px] cursor-pointer flex-col rounded-sm border-4 border-[#4a3020] bg-[#e8dcc8] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] sm:h-[220px] sm:px-4"
                          onClick={fullMoonBeatTyping.skipTyping}
                          role="presentation"
                        >
                          <p className="font-pixel-title mb-1.5 shrink-0 text-[0.5rem] uppercase tracking-wider text-[#6b4423]">
                            What happens
                          </p>
                          <p
                            className="font-pixel-ui min-h-0 flex-1 overflow-y-auto text-base leading-snug text-[#3d2914] sm:text-lg sm:leading-snug"
                            aria-live="polite"
                          >
                            {fullMoonBeatTyping.displayed}
                            {fullMoonBeatTyping.showCaret ? (
                              <span
                                className="ml-0.5 inline-block h-[1.05em] w-[3px] [vertical-align:-0.12em] bg-[#3d2914] motion-safe:animate-pulse"
                                aria-hidden
                              />
                            ) : null}
                          </p>
                        </div>
                      ) : (
                        <div
                          className="flex h-[200px] w-full cursor-pointer flex-row border-4 border-[#4a3020] bg-[#3d2914] shadow-[inset_0_2px_0_rgba(255,255,255,0.08)] sm:h-[220px]"
                          onClick={fullMoonBeatTyping.skipTyping}
                          role="region"
                          aria-label="Full moon moment"
                        >
                          <div className="flex min-h-0 min-w-0 flex-1 flex-col border-r-4 border-[#4a3020] bg-[#fce3b4] p-2 sm:p-3">
                            <p
                              className="font-pixel-ui min-h-0 flex-1 overflow-y-auto text-base leading-relaxed text-[#3d2914] sm:text-lg"
                              aria-live="polite"
                            >
                              {fullMoonBeatTyping.displayed}
                              {fullMoonBeatTyping.showCaret ? (
                                <span
                                  className="ml-0.5 inline-block h-[1.05em] w-[3px] [vertical-align:-0.12em] bg-[#3d2914] motion-safe:animate-pulse"
                                  aria-hidden
                                />
                              ) : null}
                            </p>
                          </div>
                          <div className="flex w-[100px] shrink-0 flex-col justify-between bg-gradient-to-b from-[#6b4423] to-[#4a3020] p-1.5 sm:w-[38%] sm:max-w-[180px] sm:p-2">
                            <div
                              className="mx-auto aspect-square w-full max-w-[120px] border-[3px] border-[#c9a227] shadow-[inset_0_0_0_2px_rgba(0,0,0,0.25),0_2px_0_#2d1f14] flex items-center justify-center"
                              style={{
                                background: `linear-gradient(145deg, ${FULL_MOON_BEAT.portraitFrom}, ${FULL_MOON_BEAT.portraitTo})`,
                              }}
                            >
                              <span className="font-pixel-title text-2xl text-[#fce3b4] drop-shadow-[2px_2px_0_#1a120c] sm:text-3xl">
                                {fullMoonPortraitInitial}
                              </span>
                            </div>
                            <div className="mt-1.5 flex justify-center sm:mt-2">
                              <div className="w-full rounded-full border-2 border-[#5c3d2e] bg-[#fce3b4] px-1.5 py-1 text-center shadow-[0_2px_0_#2d1f14] sm:px-2 sm:py-1.5">
                                <span className="font-pixel-title text-[0.45rem] uppercase tracking-wide text-[#2d1f14] leading-tight line-clamp-2 sm:text-[0.5rem]">
                                  Moonlight
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <DialogFooter className="mx-1 mt-2 flex h-12 shrink-0 flex-row items-center justify-end border-0 bg-transparent px-0 pb-2 sm:mx-2">
                  {!isLastFullMoonStep ? (
                    <Button
                      type="button"
                      disabled={!fullMoonBeatTyping.typingDone}
                      className={cn(
                        'h-11 w-40 shrink-0 rounded-none border-[3px] border-[#4a3020] bg-gradient-to-b from-[#8b5a3c] to-[#5c3d2e] font-pixel-title text-[0.55rem] sm:text-[0.6rem] uppercase tracking-wide text-[#fce3b4] shadow-[4px_4px_0_#1a120c] hover:from-[#9d6a4a] hover:to-[#6b4423] disabled:opacity-100',
                        !fullMoonBeatTyping.typingDone && 'pointer-events-none invisible'
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        setFullMoonSubStep((s) => Math.min(s + 1, fullMoonSubStepsTotal - 1));
                      }}
                    >
                      Next
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      disabled={!fullMoonBeatTyping.typingDone}
                      className={cn(
                        'h-11 w-40 shrink-0 rounded-none border-[3px] border-[#1a2332] bg-gradient-to-r from-slate-600 via-sky-600 to-cyan-500 font-pixel-title text-[0.55rem] sm:text-[0.6rem] uppercase tracking-wide text-white shadow-[4px_4px_0_#0f172a] disabled:opacity-100',
                        !fullMoonBeatTyping.typingDone && 'pointer-events-none invisible'
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        commitFullMoonMoment();
                        setFullMoonEventOpen(false);
                        setFullMoonEventKey(null);
                        setFullMoonSubStep(0);
                      }}
                    >
                      Continue
                    </Button>
                  )}
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={playerSkillsOpen} onOpenChange={setPlayerSkillsOpen}>
              <DialogContent className="sm:max-w-md bg-white">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-base">
                    <Sparkles className="size-4 text-pink-500" />
                    Player skills
                  </DialogTitle>
                  <DialogDescription className="text-xs">Traits on a 0–10 scale.</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-3 py-1">
                  <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3">
                    <div className="flex items-center gap-1 mb-1">
                      <Sparkles className="size-3.5 text-pink-500" />
                      <span className="text-xs font-medium text-slate-800">Beauty</span>
                    </div>
                    <StatScaleTooltip stat="beauty" side="top">
                      <div className="text-2xl font-bold text-slate-900 cursor-help">
                        {fmtStatOutOfTen(stats.beauty)}
                      </div>
                    </StatScaleTooltip>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3">
                    <div className="flex items-center gap-1 mb-1">
                      <ScrollText className="size-3.5 text-indigo-500" />
                      <span className="text-xs font-medium text-slate-800">Smarts</span>
                    </div>
                    <StatScaleTooltip stat="smarts" side="top">
                      <div className="text-2xl font-bold text-slate-900 cursor-help">
                        {fmtStatOutOfTen(stats.smarts)}
                      </div>
                    </StatScaleTooltip>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3">
                    <div className="flex items-center gap-1 mb-1">
                      <Dumbbell className="size-3.5 text-emerald-600" />
                      <span className="text-xs font-medium text-slate-800">Fitness</span>
                    </div>
                    <StatScaleTooltip stat="fitness" side="top">
                      <div className="text-2xl font-bold text-slate-900 cursor-help">
                        {fmtStatOutOfTen(stats.fitness)}
                      </div>
                    </StatScaleTooltip>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3">
                    <div className="flex items-center gap-1 mb-1">
                      <Users className="size-3.5 text-sky-600" />
                      <span className="text-xs font-medium text-slate-800">Social</span>
                    </div>
                    <StatScaleTooltip stat="social" side="top">
                      <div className="text-2xl font-bold text-slate-900 cursor-help">
                        {fmtStatOutOfTen(stats.social)}
                      </div>
                    </StatScaleTooltip>
                  </div>
                </div>
                <div className="rounded-lg border border-rose-200 bg-rose-50/60 p-3 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Tooltip delayDuration={200}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="group inline-flex items-center gap-1.5 rounded-md -m-0.5 px-0.5 py-0.5 text-left hover:bg-rose-100/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/45"
                          aria-label="Relationships — how interactions work"
                        >
                          <Heart className="size-3.5 text-rose-600 shrink-0" />
                          <span className="text-xs font-semibold text-slate-800 border-b border-dotted border-slate-400 group-hover:border-slate-600">
                            Relationships
                          </span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        className={
                          'max-w-[min(20rem,92vw)] text-left !rounded-md ' +
                          '!bg-[#eef2f8] !text-slate-900 shadow-[4px_4px_0_0_rgba(15,23,42,0.22)] ' +
                          '!border-[3px] !border-[#1a2332] px-3 py-2.5 ' +
                          '[&>svg]:fill-[#eef2f8] [&>svg]:stroke-[#1a2332]'
                        }
                      >
                        <p className="text-xs font-semibold text-slate-900 mb-1">How interactions work</p>
                        <p className="text-[11px] text-slate-700 leading-snug mb-2">
                          Each <span className="font-medium">Talk</span> with someone (campus lounge, park, gym, home,
                          etc.) adds <span className="font-medium">+1</span> to their count. That unlocks warmer lines
                          and these stages:
                        </p>
                        <ul className="text-[11px] text-slate-800 space-y-1 list-none pl-0">
                          <li>
                            <span className="font-semibold tabular-nums">0</span> — Not met
                          </li>
                          <li>
                            <span className="font-semibold tabular-nums">1–{TIER_AT.warm - 1}</span> — Stranger
                          </li>
                          <li>
                            <span className="font-semibold tabular-nums">
                              {TIER_AT.warm}–{TIER_AT.friend - 1}
                            </span>{' '}
                            — Acquaintance
                          </li>
                          <li>
                            <span className="font-semibold tabular-nums">
                              {TIER_AT.friend}–{TIER_AT.close - 1}
                            </span>{' '}
                            — Friend
                          </li>
                          <li>
                            <span className="font-semibold tabular-nums">{TIER_AT.close}+</span> — Close;{' '}
                            <span className="font-medium">Ask out</span> can appear if you&apos;re not dating someone
                            else
                          </li>
                          <li>
                            <span className="font-semibold">Dating</span> — After you ask someone out (same count
                            applies; exclusive partner)
                          </li>
                        </ul>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <ul className="space-y-2 text-xs text-slate-700">
                    {NPC_PROFILES.map((p) => {
                      const n = npcInteractions[p.id] ?? 0;
                      const stage = relationshipStageLabel(n, datingPartnerId === p.id);
                      return (
                        <li
                          key={p.id}
                          className="flex flex-col gap-0.5 border-b border-rose-100/80 pb-2 last:border-0 last:pb-0"
                        >
                          <span className="font-medium text-slate-900">{p.name}</span>
                          <span className="text-[11px] text-slate-600">
                            {p.role} · {p.where}
                          </span>
                          <span className="text-[11px]">
                            {stage} · {n} interaction{n === 1 ? '' : 's'}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setPlayerSkillsOpen(false)}>
                    Close
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

          </div>
        </div>
        {/* Stats / needs dock — below map & side column */}
        {!playerHubCollapsed && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-shrink-0 relative z-10 min-h-0 max-h-[min(52vh,560px)] overflow-y-auto overscroll-contain shadow-[0_-6px_16px_rgba(15,23,42,0.12)]"
        >
          <Card className={gameChromePanel}>
            <CardContent className="pt-3 pb-3 px-3 sm:px-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:items-stretch">
                <div className="min-w-0 md:pr-3 md:border-r md:border-slate-400/80">
                  <div className="flex items-center gap-1 mb-1 -mx-0.5 min-w-0">
                    <button
                      type="button"
                      onClick={() => setCalendarOverlayOpen(true)}
                      className="flex-1 min-w-0 text-left rounded-md px-2 py-1.5 hover:bg-slate-100/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40 transition-colors"
                      aria-label="Open calendar, weather, and schedule details"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Clock className="size-3.5 text-slate-500 shrink-0" />
                        <span className="text-xs sm:text-sm font-semibold text-slate-800 tabular-nums truncate">
                          {formatHubDateTime(stats.dayOfYear, stats.hourOfDay)}
                        </span>
                      </div>
                    </button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 shrink-0 p-0"
                      onClick={() => setInventoryOpen(true)}
                      title="Inventory"
                      aria-label="Open inventory"
                    >
                      <Package className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 shrink-0 p-0"
                      onClick={() => setPhoneOpen(true)}
                      title="Phone"
                      aria-label="Open phone"
                    >
                      <Smartphone className="size-3.5" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 px-2 py-1.5 mb-1 rounded-md border border-slate-500/50 bg-[#eef2f8]/85">
                    <Coins className="size-3.5 text-slate-500 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-medium text-slate-600 leading-none mb-0.5">Money</div>
                      <div className="text-sm font-bold text-slate-900 tabular-nums leading-tight">
                        ${formatMoney(stats.money)}
                      </div>
                      {selectedApartment && (
                        <div className="text-[10px] text-gray-600 mt-0.5 leading-snug">
                          {rentOverdue ? (
                            <span className="text-amber-800 font-medium">Rent overdue — pay by Sunday EOD</span>
                          ) : (
                            (() => {
                              const rentForDisplay =
                                selectedApartment.id === UNIVERSITY_HOUSING_ID && educationLevel === 'in-progress'
                                  ? UNIVERSITY_HOUSING_STUDENT_RENT
                                  : selectedApartment.rent;
                              const rentPerWeek = Math.round((rentForDisplay / 4) * 100) / 100;
                              const dueDay = getNextRentChargeDayOfYear(stats.dayOfYear);
                              return (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="cursor-help underline decoration-dotted decoration-gray-400">
                                      Rent ${rentPerWeek}/week
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent side="bottom" className="max-w-xs text-xs">
                                    Automatic rent is processed at the end of each week (after day 7, 14, 21…). Next week
                                    boundary you have not passed yet: <strong>day {dueDay}</strong> of the year (112-day
                                    calendar).
                                  </TooltipContent>
                                </Tooltip>
                              );
                            })()
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-1 flex gap-1 flex-wrap">
                    {DAILY_ACTIVITIES_ENABLED && (
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
                    )}
                  </div>
                  <Dialog open={calendarOverlayOpen} onOpenChange={setCalendarOverlayOpen}>
                    <DialogContent className="sm:max-w-md bg-white">
                      <DialogHeader>
                        <DialogTitle className="text-lg">
                          Year {stats.year} · {['Spring', 'Summer', 'Fall', 'Winter'][Math.floor((stats.dayOfYear - 1) / DAYS_PER_SEASON)]} · Week {Math.floor(((stats.dayOfYear - 1) % DAYS_PER_SEASON) / DAYS_PER_WEEK) + 1}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-2">
                        <div className="text-xs text-gray-700 space-y-1 pb-1 border-b border-gray-100">
                          <div className="font-medium text-gray-900">
                            {formatDate(stats.year, stats.dayOfYear)} · {formatTime(stats.hourOfDay)}
                          </div>
                          <div className="text-gray-600">
                            Life stage: <span className="font-medium capitalize">{getLifeStage(stats.year, stats.dayOfYear, stats.birthYear)}</span>
                            {(() => {
                              const toNext = getYearsToNextLifeStage(stats.year, stats.dayOfYear, stats.birthYear);
                              return toNext ? (
                                <span className="text-gray-500">
                                  {' '}
                                  · {toNext.yearsLeft} {toNext.yearsLeft === 1 ? 'year' : 'years'} until {toNext.nextStage}
                                </span>
                              ) : null;
                            })()}
                          </div>
                          {(() => {
                            const w = getWeatherForDay(stats.year, stats.dayOfYear);
                            return (
                              <div className="flex items-center gap-1.5 text-gray-600">
                                <Cloud className="size-3.5 shrink-0 text-sky-500" />
                                <span>
                                  Today: {w.type} · {w.tempF}°F · {w.quality} weather
                                </span>
                              </div>
                            );
                          })()}
                        </div>
                        <div className="grid grid-cols-7 gap-1 text-[10px] font-medium text-gray-600">
                          {DAY_NAMES_SHORT.map((d) => (
                            <div key={d} className="text-center">{d}</div>
                          ))}
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                          {(() => {
                            const WEEK_END_DAYS = [7, 14, 21, 28, 35, 42, 49, 56, 63, 70, 77, 84, 91, 98, 105, 112];
                            const seasonIdx = Math.floor((stats.dayOfYear - 1) / DAYS_PER_SEASON);
                            return Array.from({ length: DAYS_PER_SEASON }, (_, i) => i + 1).map((d) => {
                              const dayInSeason = ((stats.dayOfYear - 1) % DAYS_PER_SEASON) + 1;
                              const isCurrent = d === dayInSeason;
                              const dayOfYearForCell = seasonIdx * DAYS_PER_SEASON + d;
                              const isRentDay =
                                dayOfYearForCell === 1 || WEEK_END_DAYS.includes(dayOfYearForCell - 1);
                              const isGymDay = (dayOfYearForCell - 1) % 7 === 0;
                              const isFullMoonDay = isFullMoonCalendarDay(dayOfYearForCell);
                              return (
                                <div
                                  key={d}
                                  title={`Day ${dayOfYearForCell}${isRentDay ? ' · Rent' : ''}${isGymDay ? ' · Gym fee' : ''}${isFullMoonDay ? ' · Full moon' : ''}`}
                                  className={`aspect-square flex flex-col items-center justify-center rounded text-xs font-medium relative pb-3 ${
                                    isCurrent ? 'bg-sky-800 text-white ring-2 ring-sky-400' : 'bg-slate-200 text-slate-700'
                                  }`}
                                >
                                  <span>{d}</span>
                                  <div className="absolute bottom-0.5 left-0 right-0 flex justify-center gap-0.5 text-[9px] leading-none">
                                    {isRentDay && <span className="text-amber-600">$</span>}
                                    {isGymDay && <span className="text-sky-600">🏋</span>}
                                    {isFullMoonDay && (
                                      <span className={isCurrent ? 'text-amber-100' : 'text-indigo-700'}>🌕</span>
                                    )}
                                  </div>
                                </div>
                              );
                            });
                          })()}
                        </div>
                        <p className="text-[10px] text-gray-500">
                          $ = weekly rent charge · 🏋 = weekly gym fee (if you have a membership) · 🌕 = full moon
                          (last day of each season; at night in Dewmist Park you get a special moment)
                        </p>
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

                  <div className="mt-2 rounded-md border border-slate-500/50 bg-[#eef2f8]/85 p-2">
                    <div className="text-[10px] font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                      Status
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-800">
                      <div>
                        <div className="font-semibold text-gray-900 text-xs flex items-center gap-1">
                          <Home className="size-3.5 text-emerald-600 shrink-0" />
                          Home
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <div className="truncate">
                            {selectedApartment
                              ? selectedApartment.name
                              : gamePhase === 'selecting-home'
                                ? 'Choose a home'
                                : 'No housing'}
                          </div>
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
                          <Briefcase className="size-3.5 text-blue-500 shrink-0" />
                          Job
                        </div>
                        {selectedJob ? (
                          <div className="flex flex-col gap-1">
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
                                    Pay: ${formatMoney(salaryPerDay(selectedJob))}/day · ${formatMoney(salaryPerHour(selectedJob))}/hr
                                    <br />
                                    ${formatMoney(salaryPerDay(selectedJob) * 7)}/week · ${formatMoney(getEffectiveSalary(selectedJob))}/season
                                  </div>
                                  <div>
                                    Performance: {getPerformanceGrade(jobPerformance)} ({jobPerformance.toFixed(0)}%)
                                  </div>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                            <div className="text-[10px] text-gray-500 truncate">District: {selectedJob.district}</div>

                            {gamePhase === 'work' ? (
                              <span className="text-blue-600 text-[10px] font-medium">At workplace</span>
                            ) : (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-block w-fit">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-1.5 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 w-fit"
                                      disabled={!canGoToWorkNow()}
                                      onClick={() => {
                                        setMapOverlayOpen(false);
                                        navigateTo('work');
                                      }}
                                    >
                                      Go to work
                                    </Button>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="max-w-xs text-left">
                                  {canGoToWorkNow() ? 'You can reach the workplace and work now.' : getGoToWorkDisabledReason()}
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        ) : (
                          <div className="truncate">No job</div>
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 text-xs flex items-center gap-1">
                          <GraduationCap className="size-3.5 text-indigo-600 shrink-0" />
                          Education
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <div>
                            {educationLevel === 'none' || !educationDegree
                              ? 'Not in school'
                              : educationLevel === 'completed'
                                ? `Completed ${educationDegree!.charAt(0).toUpperCase()}${educationDegree!.slice(1)} degree`
                                : `Studying ${educationDegree!.charAt(0).toUpperCase()}${educationDegree!.slice(1)} (${fmt2(
                                    educationProgress
                                  )}%)`}
                          </div>
                          {educationLevel === 'in-progress' && gamePhase !== 'school' && (
                            campusAccess.open ? (
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
                            ) : (
                              <span className="text-[10px] text-amber-800 leading-snug">
                                Campus closed (open first 14 days of each season).
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="min-w-0 md:pl-3 md:border-l md:border-slate-400/90 flex flex-col gap-2 min-h-0 md:h-full">
                  <div className="rounded-md border border-slate-500/50 bg-[#eef2f8]/85 p-2.5 flex-1 min-h-0 flex flex-col">
                    <div className="text-xs font-semibold text-slate-900 mb-2">Basic needs</div>
                    <p className="text-[9px] text-slate-500 mb-1.5 leading-snug">Hover a stat for the full 0–100 scale.</p>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 flex-1 min-h-0">
                      <VitalScaleTooltip
                        title="Health"
                        bands={HEALTH_VITAL_BANDS}
                        scaleHint="0–100. Higher is better — overall physical condition."
                        value={stats.health}
                        moodLabel={getHealthMood(stats.health)}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1 mb-0.5">
                            <Heart
                              className={`size-3 text-red-500 shrink-0 ${
                                stats.hunger <= 0 || stats.energy <= 0 ? 'animate-heart-vitals' : ''
                              }`}
                            />
                            <span className="text-[10px] font-medium truncate">Health</span>
                          </div>
                          <div className="text-[9px] text-gray-500 truncate mb-0.5">{getHealthMood(stats.health)}</div>
                          <div className="flex items-center gap-0.5">
                            <Progress value={stats.health} className="h-1 flex-1 min-w-0" />
                            <span className="text-[10px] font-bold shrink-0">{intStat(stats.health)}</span>
                          </div>
                        </div>
                      </VitalScaleTooltip>
                      <VitalScaleTooltip
                        title="Happiness"
                        bands={HAPPINESS_VITAL_BANDS}
                        scaleHint="0–100. Higher is better — mood and life satisfaction."
                        value={stats.happiness}
                        moodLabel={getHappinessMood(stats.happiness)}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1 mb-0.5">
                            <Smile className="size-3 text-yellow-500 shrink-0" />
                            <span className="text-[10px] font-medium truncate">Happiness</span>
                          </div>
                          <div className="text-[9px] text-gray-500 truncate mb-0.5">{getHappinessMood(stats.happiness)}</div>
                          <div className="flex items-center gap-0.5">
                            <Progress value={stats.happiness} className="h-1 flex-1 min-w-0" />
                            <span className="text-[10px] font-bold shrink-0">{intStat(stats.happiness)}</span>
                          </div>
                        </div>
                      </VitalScaleTooltip>
                      <VitalScaleTooltip
                        title="Energy"
                        bands={ENERGY_VITAL_BANDS}
                        scaleHint="0–100. Higher is better — stamina for activities and work."
                        value={stats.energy}
                        moodLabel={getEnergyMood(stats.energy)}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1 mb-0.5">
                            <Zap className="size-3 text-amber-500 shrink-0" />
                            <span className="text-[10px] font-medium truncate">Energy</span>
                          </div>
                          <div className="text-[9px] text-gray-500 truncate mb-0.5">{getEnergyMood(stats.energy)}</div>
                          <div className="flex items-center gap-0.5">
                            <Progress value={stats.energy} className="h-1 flex-1 min-w-0" />
                            <span className="text-[10px] font-bold shrink-0">{intStat(stats.energy)}</span>
                          </div>
                        </div>
                      </VitalScaleTooltip>
                      <VitalScaleTooltip
                        title="Hunger"
                        bands={HUNGER_VITAL_BANDS}
                        scaleHint="0–100. Higher means more fed (fullness / satiety), not calories."
                        value={stats.hunger}
                        moodLabel={getHungerMood(stats.hunger)}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1 mb-0.5">
                            <UtensilsCrossed className="size-3 text-orange-500 shrink-0" />
                            <span className="text-[10px] font-medium truncate">Hunger</span>
                          </div>
                          <div className="text-[9px] text-gray-500 truncate mb-0.5">{getHungerMood(stats.hunger)}</div>
                          <div className="flex items-center gap-0.5">
                            <Progress value={stats.hunger} className="h-1 flex-1 min-w-0" />
                            <span className="text-[10px] font-bold shrink-0">{intStat(stats.hunger)}</span>
                          </div>
                        </div>
                      </VitalScaleTooltip>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        )}
        <div className="flex items-center justify-end flex-shrink-0 pt-0.5">
          <Button
            variant="outline"
            size="sm"
            className="h-6 px-2 text-[10px]"
            onClick={() => setPlayerHubCollapsed((v) => !v)}
          >
            {playerHubCollapsed ? 'Show player hub' : 'Hide player hub'}
          </Button>
        </div>

      </div>
      </div>
    </div>
  );
}