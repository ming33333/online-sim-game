/**
 * Pure game engine - no React/UI. Used by LifeSimGame (via hook) and simulator.
 */

import { getWeatherForDay, isGoodWeatherForWalk } from '../app/lib/weather';
import {
  APARTMENTS,
  CHARACTER_PRESETS,
  DAYS_PER_SEASON,
  DAYS_PER_YEAR,
  DEGREE_DAYS_NORMAL,
  GYM_COSTS_PER_WEEK,
  GYM_HAPPINESS,
  HUNGER_PER_HOUR,
  HUNGER_PER_WORK_HOUR,
  LIVE_WITH_PARENTS_ID,
  LIVING_WITH_PARENTS_HAPPINESS_LOSS_PER_DAY,
  LATE_WORK_PERFORMANCE_PENALTY,
  MIN_DAYS_AT_TIER_FOR_PROMOTION,
  MIN_PERFORMANCE_FOR_PROMOTION,
  OVERTIME_MULTIPLIER,
  PROMOTION_SALARY_MULTIPLIER_PER_TIER,
  RENT_GRACE_DAYS,
  SEASON_END_DAYS,
  START_YEAR,
  STUDY_HOURS_PER_DAY,
  TUITION_PER_SEASON,
  UNIVERSITY_HOUSING_ID,
  UNIVERSITY_HOUSING_STUDENT_RENT,
  WORK_INTENSITY,
  WORKOUT_EFFECTS,
} from './constants';
import type {
  Apartment,
  CharacterPreset,
  Degree,
  EducationLevel,
  EngineResult,
  GamePhase,
  GameState,
  GameStats,
  GymTier,
  Job,
  JobSchedule,
  LogEntry,
  StudyIntensity,
  WorkIntensity,
  WorkoutIntensity,
} from './types';

export type { GameState, GameStats, EngineResult } from './types';

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function getYearsAlive(year: number, dayOfYear: number, birthYear: number): number {
  return year - birthYear + (dayOfYear - 1) / DAYS_PER_YEAR;
}

export function getLifeStage(
  year: number,
  dayOfYear: number,
  birthYear: number
): 'baby' | 'child' | 'teen' | 'young adult' | 'adult' | 'elderly' {
  const years = getYearsAlive(year, dayOfYear, birthYear);
  if (years < 1) return 'baby';
  if (years < 2) return 'child';
  if (years < 4) return 'teen';
  if (years < 8) return 'young adult';
  if (years < 12) return 'adult';
  return 'elderly';
}

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function formatDayOfWeek(dayOfYear: number): string {
  return DAY_NAMES[(dayOfYear - 1) % 7];
}

function formatDate(year: number, dayOfYear: number): string {
  const season = Math.floor((dayOfYear - 1) / DAYS_PER_SEASON);
  const seasonNames = ['Spring', 'Summer', 'Fall', 'Winter'];
  const weekInSeason = Math.floor(((dayOfYear - 1) % DAYS_PER_SEASON) / 7) + 1;
  const globalWeek = Math.floor((dayOfYear - 1) / 7) + 1;
  return `${formatDayOfWeek(dayOfYear)} · Day ${dayOfYear} · Week ${globalWeek} · ${seasonNames[season]} Wk${weekInSeason}`;
}

function formatTime(hour: number): string {
  const h = ((hour % 24) + 24) % 24;
  const wholeHour = Math.floor(h);
  const minutes = Math.round((h - wholeHour) * 60) % 60;
  const hour12 = wholeHour === 0 ? 12 : wholeHour > 12 ? wholeHour - 12 : wholeHour;
  const ampm = h < 12 ? 'AM' : 'PM';
  return `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
}

function formatTimestamp(
  year: number,
  dayOfYear: number,
  birthYear: number,
  hourOfDay?: number
): string {
  const lifeStage = getLifeStage(year, dayOfYear, birthYear);
  const time = hourOfDay !== undefined ? ` ${formatTime(hourOfDay)}` : '';
  return `${formatDate(year, dayOfYear)}${time} · ${lifeStage}`;
}

const liveWithParentsApartment = APARTMENTS.find((a) => a.id === LIVE_WITH_PARENTS_ID)!;

function nextLogId(): number {
  return Date.now() + Math.floor(Math.random() * 10000);
}

export function createInitialState(preset: CharacterPreset, rng: () => number = Math.random): GameState {
  const randomStatLowBias = (min: number, max: number) => {
    const range = max - min;
    const skew = Math.pow(rng(), 1.5);
    return Math.round((min + range * skew) * 100) / 100;
  };
  return {
    stats: {
      year: START_YEAR,
      dayOfYear: 1,
      hourOfDay: 9,
      birthYear: 1996,
      health: randomStatLowBias(40, 70),
      happiness: randomStatLowBias(40, 70),
      energy: 100,
      hunger: 100,
      money: preset.startingMoney,
      beauty: preset.beauty,
      smarts: preset.smarts,
    },
    selectedApartment: null,
    selectedJob: null,
    jobSchedule: 'full-time',
    jobTierIndex: 0,
    jobTierStartedYear: START_YEAR,
    jobTierStartedDayOfYear: 1,
    jobStartedYear: null,
    jobStartedDayOfYear: null,
    jobPerformance: 70,
    rentOverdue: false,
    rentOverdueSinceDay: 0,
    lastRentPaidSeasonEndDay: null,
    educationLevel: 'none',
    educationDegree: null,
    educationProgress: 0,
    gymMembership: null,
    gymMembershipStartDay: null,
    groceries: { regular: 0, lux: 0 },
    diplomas: [],
    tuitionPaidThroughSeasonEndDay: null,
    gamePhase: 'selecting-home',
    parkDistrict: 'Ellum',
    groceryDistrict: 'Centerlight',
    eventLog: [],
    activityCount: 0,
  };
}

export { APARTMENTS, JOBS, CHARACTER_PRESETS, GROCERY_OPTIONS } from './constants';
import { JOBS } from './constants';

export function getJobsForDiplomas(diplomas: Degree[]): Job[] {
  return JOBS.filter((j) => !j.requiredDegree || diplomas.includes(j.requiredDegree));
}

function getWorkEndHour(job: Job, schedule: JobSchedule): number {
  return schedule === 'part-time' && job.workEndHourPart != null
    ? job.workEndHourPart
    : job.workEndHourFull;
}

function getTierSalaryMultiplier(tierIndex: number): number {
  return 1 + tierIndex * PROMOTION_SALARY_MULTIPLIER_PER_TIER;
}

function getEffectiveSalary(
  job: Job,
  schedule: JobSchedule,
  tierIndex: number
): number {
  const base = schedule === 'part-time' && job.allowsPartTime ? job.salary * 0.5 : job.salary;
  return base * getTierSalaryMultiplier(tierIndex);
}

function salaryPerHour(job: Job, schedule: JobSchedule, tierIndex: number): number {
  const hoursPerDay = schedule === 'part-time' && job.allowsPartTime ? 4 : 8;
  const salPerDay = (getEffectiveSalary(job, schedule, tierIndex) / DAYS_PER_SEASON);
  return salPerDay / hoursPerDay;
}

function workHoursPerShift(schedule: JobSchedule): number {
  return schedule === 'part-time' ? 4 : 8;
}

function isWeekday(dayOfYear: number): boolean {
  return ((dayOfYear - 1) % 7) < 5;
}

function isDuringWorkHours(job: Job, hour: number, schedule: JobSchedule, dayOfYear: number): boolean {
  if (job.workStartHour === 0 && job.workEndHourFull === 24) return true;
  if (!isWeekday(dayOfYear)) return false;
  const endHour = getWorkEndHour(job, schedule);
  return hour >= job.workStartHour && hour < endHour;
}

function getHoursAvailableToWork(
  job: Job,
  hour: number,
  schedule: JobSchedule,
  dayOfYear: number
): number {
  if (job.workStartHour === 0 && job.workEndHourFull === 24) return workHoursPerShift(schedule);
  if (!isWeekday(dayOfYear)) return 0;
  const endHour = getWorkEndHour(job, schedule);
  return Math.min(workHoursPerShift(schedule), Math.max(0, endHour - hour));
}

function isLateForWork(job: Job, hour: number): boolean {
  if (job.workStartHour === 0 && job.workEndHourFull === 24) return false;
  return hour > job.workStartHour;
}

function canWorkOvertime(
  job: Job,
  hour: number,
  schedule: JobSchedule,
  year: number,
  dayOfYear: number,
  jobStartedYear: number | null,
  jobStartedDayOfYear: number | null
): boolean {
  if (!job || job.workStartHour === 0) return false;
  if (jobStartedYear == null || jobStartedDayOfYear == null) return false;
  const totalDays = (year - jobStartedYear) * DAYS_PER_YEAR + (dayOfYear - jobStartedDayOfYear);
  if (totalDays < 1) return false;
  if (!isWeekday(dayOfYear)) return false;
  const endHour = getWorkEndHour(job, schedule);
  return hour >= endHour && hour < endHour + 2;
}

function hasWaitedFirstDayForJob(
  year: number,
  dayOfYear: number,
  jobStartedYear: number | null,
  jobStartedDayOfYear: number | null
): boolean {
  if (jobStartedYear == null || jobStartedDayOfYear == null) return true;
  const totalDays = (year - jobStartedYear) * DAYS_PER_YEAR + (dayOfYear - jobStartedDayOfYear);
  return totalDays >= 1;
}

function daysAtCurrentTier(
  year: number,
  dayOfYear: number,
  jobTierStartedYear: number,
  jobTierStartedDayOfYear: number
): number {
  const totalDays =
    (year - jobTierStartedYear) * DAYS_PER_YEAR + (dayOfYear - jobTierStartedDayOfYear);
  return Math.max(0, totalDays);
}

function canAskForPromotion(
  state: GameState
): { allowed: boolean; reason?: string } {
  const { selectedJob, jobTierIndex, jobPerformance, stats } = state;
  if (!selectedJob) return { allowed: false, reason: 'No job.' };
  const tiers = selectedJob.promotionTiers;
  if (jobTierIndex >= tiers.length - 1)
    return { allowed: false, reason: "Already at top." };
  if (jobPerformance < MIN_PERFORMANCE_FOR_PROMOTION)
    return { allowed: false, reason: 'Performance too low.' };
  const days = daysAtCurrentTier(
    stats.year,
    stats.dayOfYear,
    state.jobTierStartedYear,
    state.jobTierStartedDayOfYear
  );
  if (days < MIN_DAYS_AT_TIER_FOR_PROMOTION)
    return { allowed: false, reason: 'Not enough days at tier.' };
  return { allowed: true };
}

function getPromotionChance(state: GameState): number {
  const check = canAskForPromotion(state);
  if (!check.allowed) return 0;
  const { selectedJob, jobTierIndex, jobPerformance, stats } = state;
  if (!selectedJob) return 0;
  const days = daysAtCurrentTier(
    stats.year,
    stats.dayOfYear,
    state.jobTierStartedYear,
    state.jobTierStartedDayOfYear
  );
  const perfNorm = Math.max(
    0,
    Math.min(1, (jobPerformance - MIN_PERFORMANCE_FOR_PROMOTION) / (100 - MIN_PERFORMANCE_FOR_PROMOTION))
  );
  const daysNorm = Math.max(
    0,
    Math.min(1, (days - MIN_DAYS_AT_TIER_FOR_PROMOTION) / MIN_DAYS_AT_TIER_FOR_PROMOTION)
  );
  const raw = 0.2 + 0.4 * perfNorm + 0.4 * daysNorm;
  return Math.max(0.2, Math.min(0.9, raw));
}

export function isGameOver(state: GameState): boolean {
  const years = getYearsAlive(
    state.stats.year,
    state.stats.dayOfYear,
    state.stats.birthYear
  );
  return years >= 80 || state.stats.health <= 0;
}

/** Core advanceTime - handles rent, gym, eviction, health decay, etc. */
export function advanceTime(
  state: GameState,
  effect: {
    health?: number;
    happiness?: number;
    energy?: number;
    hunger?: number;
    money?: number;
    smarts?: number;
  },
  resultText: string,
  hoursPassed: number,
  overrideRentPerSeason?: number
): EngineResult {
  const { stats } = state;

  if ((effect.energy ?? 0) < 0 && stats.energy <= 0) {
    return {
      state,
      logEntries: [
        {
          id: nextLogId(),
          text: 'You are too exhausted to do that. Get some sleep.',
          timestamp: formatTimestamp(stats.year, stats.dayOfYear, stats.birthYear, stats.hourOfDay),
          effects: {},
        },
      ],
      gameOver: false,
      success: false,
      blockReason: 'exhausted',
    };
  }

  let moneyDelta = effect.money ?? 0;
  let happinessDeltaFromParents = 0;
  let newDayOfYear = stats.dayOfYear;
  let newYear = stats.year;
  let newHourOfDay = stats.hourOfDay + hoursPassed;
  let newRentOverdue = state.rentOverdue;
  let newRentOverdueSinceDay = state.rentOverdueSinceDay;
  let newSelectedApartment = state.selectedApartment;
  let newLastRentPaidSeasonEndDay = state.lastRentPaidSeasonEndDay;
  let newGymMembership = state.gymMembership;
  let newGymMembershipStartDay = state.gymMembershipStartDay;
  const extraLogEntries: LogEntry[] = [];

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
      lifeStageForDay === 'elderly' ? 8
      : lifeStageForDay === 'adult' ? 5
      : lifeStageForDay === 'young adult' ? 3
      : 0;
    healthDeltaFromDaily -= healthDecayPerDay;

    const weekEndDays = [7, 14, 21, 28, 35, 42, 49, 56, 63, 70, 77, 84, 91, 98, 105, 112];
    const justCrossedWeekEnd =
      weekEndDays.includes((newDayOfYear - 1) as 28) ||
      (newDayOfYear === 1 && stats.dayOfYear === DAYS_PER_YEAR);
    const weekJustEnded = newDayOfYear === 1 ? 112 : newDayOfYear - 1;
    const rentPerSeason =
      overrideRentPerSeason ?? (newSelectedApartment ? newSelectedApartment.rent : 0);
    const isUniversityHousing = newSelectedApartment?.id === UNIVERSITY_HOUSING_ID;
    const actualRent =
      isUniversityHousing && state.educationLevel === 'in-progress'
        ? UNIVERSITY_HOUSING_STUDENT_RENT
        : rentPerSeason;
    const actualRentPerWeek = Math.round((actualRent / 4) * 100) / 100;
    const alreadyPaidForThisSeason =
      newLastRentPaidSeasonEndDay != null &&
      newLastRentPaidSeasonEndDay >= weekJustEnded;

    if (
      justCrossedWeekEnd &&
      actualRentPerWeek > 0 &&
      !newRentOverdue &&
      !alreadyPaidForThisSeason
    ) {
      if (stats.money + moneyDelta >= actualRentPerWeek) {
        moneyDelta -= actualRentPerWeek;
        newLastRentPaidSeasonEndDay = weekJustEnded;
      } else {
        newRentOverdue = true;
        newRentOverdueSinceDay = newDayOfYear;
      }
    }

    if (
      state.educationLevel === 'in-progress' &&
      SEASON_END_DAYS.some((end) => newDayOfYear === end - 3)
    ) {
      extraLogEntries.push({
        id: nextLogId(),
        text: 'Tuition reminder: In 3 days you will owe tuition for the next season.',
        timestamp: formatTimestamp(newYear, newDayOfYear, stats.birthYear, newHourOfDay),
        effects: {},
      });
    }

    const justCrossedWeekStart = (newDayOfYear - 1) % 7 === 0;
    const currentWeekNum = Math.floor((newDayOfYear - 1) / 7);
    const joinWeekNum =
      newGymMembershipStartDay != null
        ? Math.floor((newGymMembershipStartDay - 1) / 7)
        : -1;
    if (justCrossedWeekStart && newGymMembership && currentWeekNum > joinWeekNum) {
      const gymFee = GYM_COSTS_PER_WEEK[newGymMembership];
      if (stats.money + moneyDelta >= gymFee) {
        moneyDelta -= gymFee;
      } else {
        newGymMembership = null;
        newGymMembershipStartDay = null;
        extraLogEntries.push({
          id: nextLogId(),
          text: 'You could not afford your gym membership and it was cancelled.',
          timestamp: formatTimestamp(newYear, newDayOfYear, stats.birthYear, newHourOfDay),
          effects: {},
        });
      }
    }

    if (
      newRentOverdue &&
      newDayOfYear >= newRentOverdueSinceDay + RENT_GRACE_DAYS
    ) {
      newSelectedApartment = liveWithParentsApartment;
      newRentOverdue = false;
      newRentOverdueSinceDay = 0;
      extraLogEntries.push({
        id: nextLogId(),
        text: 'You failed to pay rent and were evicted. You moved back in with your parents.',
        timestamp: formatTimestamp(newYear, newDayOfYear, stats.birthYear, newHourOfDay),
        effects: {},
      });
    }
  }

  const baseHappiness =
    stats.happiness + (effect.happiness ?? 0) + happinessDeltaFromParents;
  const baseHealth = stats.health + (effect.health ?? 0) + healthDeltaFromDaily;
  let newStats: GameStats = {
    ...stats,
    year: newYear,
    dayOfYear: newDayOfYear,
    hourOfDay: newHourOfDay,
    health: round2(Math.max(0, Math.min(100, baseHealth))),
    happiness: round2(Math.max(0, Math.min(100, baseHappiness))),
    energy: round2(Math.max(0, Math.min(100, stats.energy + (effect.energy ?? 0)))),
    hunger: round2(Math.max(0, Math.min(100, stats.hunger + (effect.hunger ?? 0)))),
    money: Math.max(0, stats.money + moneyDelta),
    smarts: round2(Math.max(0, Math.min(10, stats.smarts + (effect.smarts ?? 0)))),
  };

  if (newStats.hunger <= 0) {
    newStats = { ...newStats, health: round2(Math.max(0, newStats.health - 2)) };
  }

  const lifeStage = getLifeStage(
    newStats.year,
    newStats.dayOfYear,
    newStats.birthYear
  );
  const yearsAlive = getYearsAlive(
    newStats.year,
    newStats.dayOfYear,
    newStats.birthYear
  );
  if (lifeStage === 'elderly') {
    newStats = {
      ...newStats,
      health: round2(
        Math.max(0, newStats.health - Math.floor(hoursPassed / 168))
      ),
    };
  }

  const appliedHealth = round2(newStats.health - stats.health);
  const appliedHappiness = round2(newStats.happiness - stats.happiness);
  const appliedEnergy = round2(newStats.energy - stats.energy);
  const appliedHunger = round2(newStats.hunger - stats.hunger);
  const appliedMoney = round2(newStats.money - stats.money);
  const appliedSmarts = round2(newStats.smarts - stats.smarts);
  const logEffects: LogEntry['effects'] = {};
  if (appliedHealth !== 0) logEffects.health = appliedHealth;
  if (appliedHappiness !== 0) logEffects.happiness = appliedHappiness;
  if (appliedEnergy !== 0) logEffects.energy = appliedEnergy;
  if (appliedHunger !== 0) logEffects.hunger = appliedHunger;
  if (appliedMoney !== 0) logEffects.money = appliedMoney;
  if (appliedSmarts !== 0) logEffects.smarts = appliedSmarts;

  const logText =
    happinessDeltaFromParents < 0
      ? `${resultText} (Living with parents: -${Math.abs(happinessDeltaFromParents).toFixed(2)} happiness.)`
      : resultText;

  const mainLogEntry: LogEntry = {
    id: nextLogId(),
    text: logText,
    timestamp: formatTimestamp(
      newStats.year,
      newStats.dayOfYear,
      newStats.birthYear,
      newStats.hourOfDay
    ),
    effects: logEffects,
  };

  const newState: GameState = {
    ...state,
    stats: newStats,
    rentOverdue: newRentOverdue,
    rentOverdueSinceDay: newRentOverdueSinceDay,
    selectedApartment: newSelectedApartment,
    lastRentPaidSeasonEndDay: newLastRentPaidSeasonEndDay,
    gymMembership: newGymMembership,
    gymMembershipStartDay: newGymMembershipStartDay,
    eventLog: [mainLogEntry, ...extraLogEntries, ...state.eventLog],
    activityCount: state.activityCount + 1,
  };

  const gameOver = yearsAlive >= 80 || newStats.health <= 0;

  return {
    state: newState,
    logEntries: [mainLogEntry, ...extraLogEntries],
    gameOver,
    success: true,
  };
}

export function selectApartment(state: GameState, apartment: Apartment): EngineResult {
  if (state.gamePhase !== 'selecting-home') {
    return { state, logEntries: [], gameOver: false, success: false };
  }

  const isEnrolled = state.educationLevel === 'in-progress';
  const isMovingToUniversityHousing = apartment.id === UNIVERSITY_HOUSING_ID;
  const fullSeasonRent =
    isMovingToUniversityHousing && isEnrolled
      ? UNIVERSITY_HOUSING_STUDENT_RENT
      : apartment.rent;

  const weekEndDays = [7, 14, 21, 28, 35, 42, 49, 56, 63, 70, 77, 84, 91, 98, 105, 112];
  const weekEnd = weekEndDays.find((d) => d >= state.stats.dayOfYear) ?? 112;
  const daysLeftInWeek = weekEnd - state.stats.dayOfYear + 1;
  const weeklyRent = fullSeasonRent > 0 ? fullSeasonRent / 4 : 0;
  const rentToCharge = weeklyRent > 0 ? Math.round((daysLeftInWeek / 7) * weeklyRent) : 0;

  if (rentToCharge > 0 && state.stats.money < rentToCharge) {
    return { state, logEntries: [], gameOver: false, success: false };
  }

  const moneyAfterRent =
    rentToCharge > 0 ? Math.max(0, state.stats.money - rentToCharge) : state.stats.money;
  const newStats: GameStats = {
    ...state.stats,
    health: round2(
      Math.max(0, Math.min(100, state.stats.health + (apartment.bonus.health ?? 0)))
    ),
    happiness: round2(
      Math.max(0, Math.min(100, state.stats.happiness + (apartment.bonus.happiness ?? 0)))
    ),
    money: moneyAfterRent,
  };

  const firstWeekEnd = weekEndDays.find((d) => d >= state.stats.dayOfYear) ?? 7;
  const newLastRentPaid =
    rentToCharge > 0 ? (state.stats.dayOfYear <= 7 ? Math.max(0, firstWeekEnd - 7) : firstWeekEnd) : null;

  const rentNote =
    rentToCharge > 0
      ? ` First week's rent ($${rentToCharge}) paid.`
      : ' No rent.';

  const logEntry: LogEntry = {
    id: nextLogId(),
    text: `You moved into ${apartment.name}! ${apartment.bonusDescription}.${rentNote}`,
    timestamp: formatTimestamp(
      newStats.year,
      newStats.dayOfYear,
      newStats.birthYear,
      newStats.hourOfDay
    ),
    effects: {
      ...(apartment.bonus.health != null && { health: round2(apartment.bonus.health) }),
      ...(apartment.bonus.happiness != null && {
        happiness: round2(apartment.bonus.happiness),
      }),
    },
  };

  const newState: GameState = {
    ...state,
    stats: newStats,
    selectedApartment: apartment,
    lastRentPaidSeasonEndDay: newLastRentPaid,
    gamePhase: 'free-play',
    eventLog: [logEntry, ...state.eventLog],
  };

  return {
    state: newState,
    logEntries: [logEntry],
    gameOver: false,
    success: true,
  };
}

export function selectJob(
  state: GameState,
  job: Job,
  schedule?: JobSchedule
): EngineResult {
  const sched = schedule ?? state.jobSchedule;
  const newState: GameState = {
    ...state,
    selectedJob: job,
    jobTierIndex: 0,
    jobTierStartedYear: state.stats.year,
    jobTierStartedDayOfYear: state.stats.dayOfYear,
    jobStartedYear: state.stats.year,
    jobStartedDayOfYear: state.stats.dayOfYear,
    jobPerformance: 70,
    gamePhase: 'free-play',
  };
  if (schedule) newState.jobSchedule = schedule;

  const hours =
    sched === 'part-time' && job.allowsPartTime
      ? '20 hr/week (part-time)'
      : '40 hr/week (full-time)';
  const title = job.promotionTiers[0];

  const logEntry: LogEntry = {
    id: nextLogId(),
    text: `You accepted a job as ${title} (${hours}).`,
    timestamp: formatTimestamp(
      state.stats.year,
      state.stats.dayOfYear,
      state.stats.birthYear,
      state.stats.hourOfDay
    ),
    effects: {},
  };
  newState.eventLog = [logEntry, ...newState.eventLog];

  return {
    state: newState,
    logEntries: [logEntry],
    gameOver: false,
    success: true,
  };
}

export function workShift(
  state: GameState,
  overtimeHours: number = 0,
  intensity: WorkIntensity = 'normal'
): EngineResult {
  const { selectedJob, stats, jobSchedule, jobTierIndex, jobPerformance } = state;
  if (!selectedJob) return { state, logEntries: [], gameOver: false, success: false };

  const dayOfYear = stats.dayOfYear;
  const inOvertimeWindow =
    overtimeHours > 0 &&
    canWorkOvertime(
      selectedJob,
      stats.hourOfDay,
      jobSchedule,
      stats.year,
      dayOfYear,
      state.jobStartedYear,
      state.jobStartedDayOfYear
    );
  const inRegularHours =
    hasWaitedFirstDayForJob(
      stats.year,
      stats.dayOfYear,
      state.jobStartedYear,
      state.jobStartedDayOfYear
    ) &&
    isDuringWorkHours(selectedJob, stats.hourOfDay, jobSchedule, dayOfYear) &&
    getHoursAvailableToWork(selectedJob, stats.hourOfDay, jobSchedule, dayOfYear) > 0;

  if (!inOvertimeWindow && !inRegularHours) {
    return { state, logEntries: [], gameOver: false, success: false };
  }

  const baseHours = inOvertimeWindow
    ? 0
    : getHoursAvailableToWork(selectedJob, stats.hourOfDay, jobSchedule, dayOfYear);
  const totalHours = baseHours + overtimeHours;
  const isOT = overtimeHours > 0;
  const hrRate = salaryPerHour(selectedJob, jobSchedule, jobTierIndex);
  const basePay = hrRate * baseHours;
  const otPay = isOT ? hrRate * overtimeHours * OVERTIME_MULTIPLIER : 0;
  const actualPay = Math.round((basePay + otPay) * 100) / 100;

  const late =
    !inOvertimeWindow &&
    isLateForWork(selectedJob, stats.hourOfDay);
  const { perfDelta, happinessMultiplier } = WORK_INTENSITY[intensity];
  const newPerformance = Math.max(
    0,
    Math.min(
      100,
      jobPerformance + (late ? -LATE_WORK_PERFORMANCE_PENALTY : perfDelta)
    )
  );

  const healthDelta =
    ((selectedJob.effect.health ?? 0) * totalHours) / (8 * DAYS_PER_SEASON);
  const baseHappinessDelta =
    ((selectedJob.effect.happiness ?? 0) * totalHours) / (8 * DAYS_PER_SEASON);
  const happinessDelta = baseHappinessDelta * happinessMultiplier;
  const energyCost = WORK_INTENSITY[intensity].energyCost;

  const jobTitle = selectedJob.promotionTiers[
    Math.min(jobTierIndex, selectedJob.promotionTiers.length - 1)
  ];
  const intensityLabel =
    intensity === 'slack' ? 'Slack' : intensity === 'hard' ? 'Hard' : 'Normal';
  let msg = `You worked ${totalHours} hour${totalHours > 1 ? 's' : ''} as ${jobTitle} (${intensityLabel}). `;
  if (isOT) msg += '(Overtime) ';
  if (late) msg += '(Late.) ';
  msg += `Earned $${actualPay.toFixed(2)}.`;

  const hungerCost = -HUNGER_PER_WORK_HOUR * totalHours;

  const stateWithPerf: GameState = {
    ...state,
    jobPerformance: newPerformance,
  };

  const result = advanceTime(
    stateWithPerf,
    {
      health: healthDelta,
      happiness: happinessDelta,
      energy: -energyCost,
      hunger: hungerCost,
      money: actualPay,
    },
    msg,
    totalHours
  );

  result.state.jobPerformance = newPerformance;
  return result;
}

export function askForPromotion(
  state: GameState,
  rng: () => number = Math.random
): EngineResult {
  const check = canAskForPromotion(state);
  if (!check.allowed || !state.selectedJob) {
    return { state, logEntries: [], gameOver: false, success: false };
  }

  const chance = getPromotionChance(state);
  if (rng() >= chance) {
    const failEntry: LogEntry = {
      id: nextLogId(),
      text: `You asked for a promotion, but it didn't work out. (Chance: ${(chance * 100).toFixed(0)}%)`,
      timestamp: formatTimestamp(
        state.stats.year,
        state.stats.dayOfYear,
        state.stats.birthYear,
        state.stats.hourOfDay
      ),
      effects: {},
    };
    return {
      state: { ...state, eventLog: [failEntry, ...state.eventLog] },
      logEntries: [failEntry],
      gameOver: false,
      success: true,
    };
  }

  const nextTier = state.jobTierIndex + 1;
  const newTitle = state.selectedJob.promotionTiers[nextTier];

  const newState: GameState = {
    ...state,
    jobTierIndex: nextTier,
    jobTierStartedYear: state.stats.year,
    jobTierStartedDayOfYear: state.stats.dayOfYear,
    eventLog: [
      {
        id: nextLogId(),
        text: `You were promoted to ${newTitle}!`,
        timestamp: formatTimestamp(
          state.stats.year,
          state.stats.dayOfYear,
          state.stats.birthYear,
          state.stats.hourOfDay
        ),
        effects: {},
      },
      ...state.eventLog,
    ],
  };

  return {
    state: newState,
    logEntries: newState.eventLog.slice(0, 1),
    gameOver: false,
    success: true,
  };
}

export function passOneHour(state: GameState): EngineResult {
  return advanceTime(
    state,
    { hunger: -HUNGER_PER_HOUR },
    '1 hour passed.',
    1
  );
}

export function sleep(state: GameState, hours: number): EngineResult {
  const energyGain = Math.min(
    hours * 10,
    100 - state.stats.energy
  );
  const result = advanceTime(
    { ...state, gamePhase: 'home' },
    { energy: energyGain },
    `You slept for ${hours} hour${hours > 1 ? 's' : ''}. Energy +${energyGain}.`,
    hours
  );
  result.state.gamePhase = 'home';
  return result;
}

export function eatMeal(
  state: GameState,
  type: 'regular' | 'lux'
): EngineResult {
  const hungerGain = type === 'regular' ? 30 : 50;
  const key = type;
  if (state.groceries[key] <= 0) {
    return { state, logEntries: [], gameOver: false, success: false };
  }

  const newGroceries = {
    ...state.groceries,
    [key]: state.groceries[key] - 1,
  };

  const result = advanceTime(
    { ...state, groceries: newGroceries },
    { hunger: hungerGain },
    `You ate a ${type} meal. Hunger +${hungerGain}.`,
    0.25
  );
  result.state.groceries = newGroceries;
  return result;
}

export function buyGroceries(
  state: GameState,
  optionId: string,
  meals: number,
  hungerPerMeal: number,
  cost: number
): EngineResult {
  if (state.stats.money < cost) {
    return { state, logEntries: [], gameOver: false, success: false };
  }

  const isLux = hungerPerMeal >= 50;
  const newGroceries = {
    ...state.groceries,
    [isLux ? 'lux' : 'regular']:
      state.groceries[isLux ? 'lux' : 'regular'] + meals,
  };

  const result = advanceTime(
    { ...state, groceries: newGroceries },
    { money: -cost },
    `You bought groceries (${meals} meals, ${hungerPerMeal} hunger/meal).`,
    0
  );
  result.state.groceries = newGroceries;
  return result;
}

export function selectGymMembership(state: GameState, tier: GymTier): EngineResult {
  const weeklyCost = GYM_COSTS_PER_WEEK[tier];
  const daysRemainingInWeek = 7 - ((state.stats.dayOfYear - 1) % 7);
  const proratedCost = Math.round((daysRemainingInWeek / 7) * weeklyCost * 100) / 100;

  if (state.stats.money < proratedCost) {
    return { state, logEntries: [], gameOver: false, success: false };
  }

  const gymName =
    tier === 'cheap' ? 'Budget Gym' : tier === 'luxury' ? 'Elite Wellness' : 'FitZone';
  const isSwitch = state.gymMembership != null && state.gymMembership !== tier;

  const stateWithGym: GameState = {
    ...state,
    gymMembership: tier,
    gymMembershipStartDay: state.stats.dayOfYear,
  };

  const result = advanceTime(
    stateWithGym,
    { money: -proratedCost },
    isSwitch
      ? `Switched to ${gymName}. Prorated: $${proratedCost.toFixed(2)}.`
      : `Joined ${gymName}. Prorated: $${proratedCost.toFixed(2)}.`,
    0
  );
  result.state.gymMembership = tier;
  result.state.gymMembershipStartDay = state.stats.dayOfYear;
  return result;
}

export function gymWorkout(
  state: GameState,
  tier: GymTier,
  intensity: WorkoutIntensity
): EngineResult {
  const { energyCost, healthGain } = WORKOUT_EFFECTS[intensity];
  const happinessDelta = GYM_HAPPINESS[tier];

  if (state.stats.energy < energyCost) {
    return { state, logEntries: [], gameOver: false, success: false };
  }

  return advanceTime(
    state,
    {
      health: healthGain,
      happiness: happinessDelta,
      energy: -energyCost,
      hunger: -2,
    },
    `You worked out at the gym (${intensity}).`,
    1
  );
}

export function parkWalk(state: GameState): EngineResult {
  const energyCost = 1;
  const healthGain = 0.3;
  if (state.stats.energy < energyCost) {
    return { state, logEntries: [], gameOver: false, success: false };
  }

  const weather = getWeatherForDay(state.stats.year, state.stats.dayOfYear);
  const happinessBonus = isGoodWeatherForWalk(weather.quality) ? 1 : 0;

  const effects: {
    health?: number;
    happiness?: number;
    energy?: number;
    hunger?: number;
  } = { health: healthGain, energy: -energyCost, hunger: -1 };
  if (happinessBonus > 0) effects.happiness = happinessBonus;

  const msg =
    happinessBonus > 0
      ? 'You took a walk in the park. Nice weather! Health +0.30, Happiness +1.'
      : 'You took a walk in the park. Health +0.30.';

  return advanceTime(state, effects, msg, 1);
}

export function payTuition(
  state: GameState,
  forNextSeason: boolean = false
): EngineResult {
  const seasonIndex = SEASON_END_DAYS.findIndex((d) => d >= state.stats.dayOfYear);
  const currentSeasonIndex = seasonIndex >= 0 ? seasonIndex : SEASON_END_DAYS.length - 1;
  const targetSeasonIndex = forNextSeason
    ? (currentSeasonIndex + 1) % SEASON_END_DAYS.length
    : currentSeasonIndex;
  const seasonEnd = SEASON_END_DAYS[targetSeasonIndex];

  if (
    state.tuitionPaidThroughSeasonEndDay != null &&
    state.tuitionPaidThroughSeasonEndDay >= seasonEnd
  ) {
    return { state, logEntries: [], gameOver: false, success: true };
  }

  let tuitionForSeason: number;
  if (forNextSeason) {
    tuitionForSeason = TUITION_PER_SEASON;
  } else {
    const daysLeftInSeason = seasonEnd - state.stats.dayOfYear + 1;
    const isProrated = daysLeftInSeason < DAYS_PER_SEASON;
    tuitionForSeason = isProrated
      ? Math.round((daysLeftInSeason / DAYS_PER_SEASON) * TUITION_PER_SEASON)
      : TUITION_PER_SEASON;
  }

  if (state.stats.money < tuitionForSeason) {
    return { state, logEntries: [], gameOver: false, success: false };
  }

  const newState: GameState = {
    ...state,
    stats: { ...state.stats, money: Math.max(0, state.stats.money - tuitionForSeason) },
    tuitionPaidThroughSeasonEndDay: seasonEnd,
  };

  const logEntry: LogEntry = {
    id: nextLogId(),
    text: `You paid $${tuitionForSeason.toLocaleString()} tuition.`,
    timestamp: formatTimestamp(
      state.stats.year,
      state.stats.dayOfYear,
      state.stats.birthYear
    ),
    effects: { money: -tuitionForSeason },
  };
  newState.eventLog = [logEntry, ...newState.eventLog];

  return {
    state: newState,
    logEntries: [logEntry],
    gameOver: false,
    success: true,
  };
}

export function startDegree(state: GameState, degree: Degree): EngineResult {
  const payResult = payTuition({ ...state, educationDegree: degree, educationLevel: 'in-progress' }, false);
  if (!payResult.success) return payResult;

  const newState: GameState = {
    ...payResult.state,
    educationDegree: degree,
    educationLevel: 'in-progress' as EducationLevel,
    educationProgress: 0,
  };

  return {
    state: newState,
    logEntries: payResult.logEntries,
    gameOver: false,
    success: true,
  };
}

const STUDY_INTENSITY_EFFECTS: Record<
  StudyIntensity,
  {
    health: number;
    happiness: number;
    energy: number;
    hunger: number;
    baseSmartsGain: number;
  }
> = {
  slack: {
    health: -1,
    happiness: -0.5,
    energy: -30,
    hunger: -12,
    baseSmartsGain: 0.25 / DEGREE_DAYS_NORMAL,
  },
  normal: {
    health: -2,
    happiness: -1,
    energy: -50,
    hunger: -16,
    baseSmartsGain: 0.4 / DEGREE_DAYS_NORMAL,
  },
  focus: {
    health: -3,
    happiness: -2,
    energy: -80,
    hunger: -22,
    baseSmartsGain: 0.55 / DEGREE_DAYS_NORMAL,
  },
};

const STUDY_MULTIPLIERS: Record<StudyIntensity, number> = {
  slack: 0.4 / 0.5,
  normal: 1,
  focus: 0.66 / 0.5,
};

export function study(
  state: GameState,
  intensity: StudyIntensity,
  hours: number
): EngineResult {
  if (!state.educationDegree) {
    return { state, logEntries: [], gameOver: false, success: false };
  }

  const seasonEnd = SEASON_END_DAYS.find((d) => d >= state.stats.dayOfYear) ?? 112;
  if (
    state.tuitionPaidThroughSeasonEndDay == null ||
    state.tuitionPaidThroughSeasonEndDay < seasonEnd
  ) {
    return { state, logEntries: [], gameOver: false, success: false };
  }

  const scale = hours / STUDY_HOURS_PER_DAY;
  const progressPerDayNormal = 100 / DEGREE_DAYS_NORMAL;
  const multipliers = STUDY_MULTIPLIERS[intensity];
  const rawDelta = progressPerDayNormal * multipliers * scale * 0.5;
  const progressDelta = Math.min(
    100 - state.educationProgress,
    Math.round(rawDelta * 100) / 100
  );
  const newProgress = Math.round((state.educationProgress + progressDelta) * 100) / 100;

  const baseEffects = STUDY_INTENSITY_EFFECTS[intensity];
  const effects = {
    health: baseEffects.health * scale,
    happiness: baseEffects.happiness * scale,
    energy: baseEffects.energy * scale,
    hunger: baseEffects.hunger * scale,
    smarts: 0, // computed below
  };

  const diminishingFactor = 1 - Math.min(1, state.stats.smarts / 20);
  const smartsGainRaw = baseEffects.baseSmartsGain * diminishingFactor * 4 * scale;
  effects.smarts = Math.round(smartsGainRaw * 100) / 100;

  const result = advanceTime(
    state,
    effects,
    `You studied your ${state.educationDegree} degree for ${hours} hour${hours !== 1 ? 's' : ''} (${intensity}).`,
    hours
  );

  result.state.educationProgress = newProgress;
  result.state.educationLevel =
    newProgress >= 100 ? 'completed' : 'in-progress';
  if (newProgress >= 100 && state.educationDegree) {
    result.state.diplomas = result.state.diplomas.includes(state.educationDegree)
      ? result.state.diplomas
      : [...result.state.diplomas, state.educationDegree];
    result.state.educationDegree = null;
  }

  return result;
}
