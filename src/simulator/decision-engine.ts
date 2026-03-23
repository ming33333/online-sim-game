/**
 * Smart bot decision engine: maximize money in 2 years.
 * Strategy: degree → job → promotions. Survival priority when stats low.
 */

import {
  APARTMENTS,
  GROCERY_OPTIONS,
  JOBS,
  SEASON_END_DAYS,
  TUITION_PER_SEASON,
  UNIVERSITY_HOUSING_ID,
} from '../game/constants';
import {
  askForPromotion,
  buyGroceries,
  eatMeal,
  getJobsForDiplomas,
  gymWorkout,
  passOneHour,
  parkWalk,
  selectApartment,
  selectGymMembership,
  selectJob,
  sleep,
  startDegree,
  payTuition,
  study,
  workShift,
} from '../game/engine';
import type {
  Apartment,
  Degree,
  GameState,
  GymTier,
  Job,
} from '../game/types';
import type { SmartBotConfig } from './bot-types';

export type BotAction =
  | { type: 'select-apartment'; apartment: Apartment }
  | { type: 'select-job'; job: Job; schedule?: 'full-time' | 'part-time' }
  | { type: 'work'; overtimeHours?: number; intensity?: 'slack' | 'normal' | 'hard' }
  | { type: 'ask-promotion' }
  | { type: 'sleep'; hours: number }
  | { type: 'eat'; mealType: 'regular' | 'lux' }
  | { type: 'gym-workout'; intensity: 'easy' | 'normal' | 'intense' }
  | { type: 'park-walk' }
  | { type: 'study'; hours: number; intensity: 'slack' | 'normal' | 'focus' }
  | { type: 'buy-groceries'; optionId: string; meals: number; hungerPerMeal: number; cost: number }
  | { type: 'select-gym'; tier: GymTier }
  | { type: 'start-degree'; degree: Degree }
  | { type: 'pay-tuition'; forNextSeason?: boolean }
  | { type: 'pass-time' };

function isWeekday(dayOfYear: number): boolean {
  return ((dayOfYear - 1) % 7) < 5;
}

function getWorkEndHour(job: Job, schedule: 'full-time' | 'part-time'): number {
  return schedule === 'part-time' && job.workEndHourPart != null
    ? job.workEndHourPart
    : job.workEndHourFull;
}

function canWork(state: GameState): boolean {
  const { selectedJob, jobSchedule, stats, jobStartedYear, jobStartedDayOfYear } = state;
  if (!selectedJob) return false;
  if (jobStartedYear == null || jobStartedDayOfYear == null) return false;
  const totalDays =
    (stats.year - jobStartedYear) * 112 + (stats.dayOfYear - jobStartedDayOfYear);
  if (totalDays < 1) return false;
  if (!isWeekday(stats.dayOfYear)) return false;
  const endHour = getWorkEndHour(selectedJob, jobSchedule);
  return (
    stats.hourOfDay >= selectedJob.workStartHour &&
    stats.hourOfDay < endHour &&
    (selectedJob.workStartHour === 0 && selectedJob.workEndHourFull === 24
      ? true
      : true)
  );
}

function canWorkOvertime(state: GameState): boolean {
  const { selectedJob, jobSchedule, stats, jobStartedYear, jobStartedDayOfYear } = state;
  if (!selectedJob || selectedJob.workStartHour === 0) return false;
  if (jobStartedYear == null || jobStartedDayOfYear == null) return false;
  const totalDays =
    (stats.year - jobStartedYear) * 112 + (stats.dayOfYear - jobStartedDayOfYear);
  if (totalDays < 1) return false;
  if (!isWeekday(stats.dayOfYear)) return false;
  const endHour = getWorkEndHour(selectedJob, jobSchedule);
  return stats.hourOfDay >= endHour && stats.hourOfDay < endHour + 2;
}

function canAskPromotion(state: GameState): boolean {
  const { selectedJob, jobTierIndex, jobPerformance } = state;
  if (!selectedJob) return false;
  if (jobTierIndex >= selectedJob.promotionTiers.length - 1) return false;
  if (jobPerformance < 80) return false;
  const days =
    (state.stats.year - state.jobTierStartedYear) * 112 +
    (state.stats.dayOfYear - state.jobTierStartedDayOfYear);
  return days >= 28;
}

function canStudy(state: GameState): boolean {
  if (!state.educationDegree || state.educationLevel !== 'in-progress') return false;
  const seasonEnd = SEASON_END_DAYS.find((d) => d >= state.stats.dayOfYear) ?? 112;
  return (
    state.tuitionPaidThroughSeasonEndDay != null &&
    state.tuitionPaidThroughSeasonEndDay >= seasonEnd
  );
}

/** Pick best degree for money: finance (6500) > software (6000) > accounting (4500) */
function getBestDegreeForMoney(): Degree {
  return 'finance';
}

/** Pick highest-paying job available for diplomas */
function getBestJob(jobs: Job[]): Job {
  return jobs.reduce((best, j) => (j.salary > best.salary ? j : best));
}

export function getAvailableActions(state: GameState): BotAction[] {
  const actions: BotAction[] = [];

  if (state.gamePhase === 'selecting-home') {
    for (const apt of APARTMENTS) {
      const rent =
        apt.rent > 0
          ? Math.round(
              ((SEASON_END_DAYS.find((d) => d >= state.stats.dayOfYear) ?? 112) -
                state.stats.dayOfYear +
                1) *
                (apt.rent / 28)
            )
          : 0;
      if (state.stats.money >= rent) {
        actions.push({ type: 'select-apartment', apartment: apt });
      }
    }
  }

  if (state.gamePhase === 'selecting-job' || (state.gamePhase === 'free-play' && !state.selectedJob)) {
    const availableJobs = getJobsForDiplomas(state.diplomas);
    for (const job of availableJobs) {
      actions.push({ type: 'select-job', job, schedule: 'full-time' });
      if (job.allowsPartTime) {
        actions.push({ type: 'select-job', job, schedule: 'part-time' });
      }
    }
  }

  if (state.gamePhase === 'free-play') {
    if (canWork(state)) {
      actions.push({ type: 'work', overtimeHours: 0, intensity: 'normal' });
      actions.push({ type: 'work', overtimeHours: 0, intensity: 'hard' });
    }
    if (canWorkOvertime(state)) {
      actions.push({ type: 'work', overtimeHours: 2, intensity: 'hard' });
    }
    if (canAskPromotion(state)) {
      actions.push({ type: 'ask-promotion' });
    }
    actions.push({ type: 'sleep', hours: 8 });
    actions.push({ type: 'sleep', hours: 4 });
    if (state.groceries.regular > 0) {
      actions.push({ type: 'eat', mealType: 'regular' });
    }
    if (state.groceries.lux > 0) {
      actions.push({ type: 'eat', mealType: 'lux' });
    }
    if (state.gymMembership && state.stats.energy >= 5) {
      actions.push({ type: 'gym-workout', intensity: 'normal' });
      actions.push({ type: 'gym-workout', intensity: 'intense' });
    } else if (!state.gymMembership && state.stats.money >= 50) {
      actions.push({ type: 'select-gym', tier: 'cheap' });
    }
    if (state.stats.energy >= 1) {
      actions.push({ type: 'park-walk' });
    }
    if (canStudy(state)) {
      actions.push({ type: 'study', hours: 8, intensity: 'normal' });
      actions.push({ type: 'study', hours: 8, intensity: 'focus' });
    }
    if (state.educationLevel === 'none' && state.stats.money >= TUITION_PER_SEASON) {
      actions.push({ type: 'start-degree', degree: getBestDegreeForMoney() });
    }
    if (state.educationLevel === 'in-progress' && state.tuitionPaidThroughSeasonEndDay != null) {
      const seasonEnd = SEASON_END_DAYS.find((d) => d >= state.stats.dayOfYear) ?? 112;
      if (state.tuitionPaidThroughSeasonEndDay < seasonEnd) {
        const tuition =
          (seasonEnd - state.stats.dayOfYear + 1) < 28
            ? Math.round(
                ((seasonEnd - state.stats.dayOfYear + 1) / 28) * TUITION_PER_SEASON
              )
            : TUITION_PER_SEASON;
        if (state.stats.money >= tuition) {
          actions.push({ type: 'pay-tuition', forNextSeason: false });
        }
      }
    }
    for (const opt of GROCERY_OPTIONS) {
      if (state.stats.money >= opt.cost) {
        actions.push({
          type: 'buy-groceries',
          optionId: opt.id,
          meals: opt.meals,
          hungerPerMeal: opt.hungerPerMeal,
          cost: opt.cost,
        });
      }
    }
    actions.push({ type: 'pass-time' });
  }

  return actions;
}

/**
 * Score actions for smart money-maximizing bot.
 * Survival first, then degree→job→promotions.
 */
function scoreSmartBotAction(
  action: BotAction,
  state: GameState,
  config: SmartBotConfig
): number {
  const { stats } = state;
  const hungerCritical = stats.hunger < config.hungerThreshold;
  const energyCritical = stats.energy < config.energyThreshold;
  const healthCritical = stats.health < config.healthThreshold;
  const totalMeals = state.groceries.regular + state.groceries.lux;
  const lowOnMeals = totalMeals < config.minMealsBeforeBuy;

  // 1. SURVIVAL - highest priority
  if (hungerCritical && action.type === 'eat') return 100;
  if (hungerCritical && action.type === 'buy-groceries' && lowOnMeals) return 98;
  if (energyCritical && action.type === 'sleep') return 95;
  if (healthCritical && (action.type === 'gym-workout' || action.type === 'park-walk')) {
    return action.type === 'gym-workout' ? 92 : 90;
  }
  if (stats.energy < 10 && action.type === 'sleep') return 88;

  // 2. Prevent future crises
  if (stats.hunger < 60 && action.type === 'eat' && totalMeals > 0) return 70;
  if (lowOnMeals && action.type === 'buy-groceries' && stats.money >= 75) return 68;
  if (stats.energy < 50 && action.type === 'sleep') return 65;
  if (stats.health < 70 && (action.type === 'gym-workout' || action.type === 'park-walk')) {
    return action.type === 'gym-workout' ? 62 : 60;
  }

  // 3. MONEY - need job for income (rent/tuition) before degree
  const inSchool = state.educationLevel === 'in-progress';
  const needIncome = !state.selectedJob && (inSchool || stats.money < 1200);

  if (action.type === 'select-job') {
    const jobAction = action as { job: Job; schedule?: 'full-time' | 'part-time' };
    const schedule = jobAction.schedule ?? 'full-time';
    const jobs = getJobsForDiplomas(state.diplomas);
    const best = getBestJob(jobs);
    const isBest = jobAction.job.id === best.id;
    if (needIncome) {
      const partTimeBonus = inSchool && schedule === 'part-time' ? 15 : 0;
      return 88 + partTimeBonus;
    }
    return isBest ? 78 : 50;
  }
  if (action.type === 'ask-promotion') return 85;
  if (action.type === 'work') {
    const w = action as Extract<BotAction, { type: 'work' }>;
    if (w.overtimeHours) return 82;
    return w.intensity === 'hard' ? 80 : 75;
  }
  if (needIncome) {
    if (action.type === 'start-degree') return 30;
    if (action.type === 'study') return 25;
  }
  if (action.type === 'start-degree') return stats.money >= 1500 ? 76 : 35;
  if (action.type === 'pay-tuition') return 74;
  if (action.type === 'study') {
    const s = action as Extract<BotAction, { type: 'study' }>;
    return s.intensity === 'focus' ? 72 : 68;
  }

  // 4. Apartment: cheap (live-with-parents or university if studying)
  if (action.type === 'select-apartment') {
    const apt = action.apartment;
    if (apt.rent === 0) return 60; // live with parents
    if (apt.id === UNIVERSITY_HOUSING_ID && state.educationLevel === 'in-progress') return 58;
    if (apt.rent <= 700) return 55;
    return 40;
  }

  // 5. Gym only if health needs it and we have energy
  if (action.type === 'select-gym' && stats.health < 75) return 45;
  if (action.type === 'sleep') return 30;
  if (action.type === 'eat') return 25;
  if (action.type === 'pass-time') return 5;
  return 10;
}

export function selectNextAction(
  state: GameState,
  config: SmartBotConfig,
  rng: () => number = Math.random
): BotAction | null {
  const actions = getAvailableActions(state);
  if (actions.length === 0) return null;

  const scored = actions.map((action) => ({
    action,
    score: scoreSmartBotAction(action, state, config),
  }));

  scored.sort((a, b) => b.score - a.score);
  const bestScore = scored[0].score;
  const bestActions = scored.filter((s) => s.score === bestScore);
  const picked = bestActions[Math.floor(rng() * bestActions.length)];
  return picked?.action ?? null;
}

export function executeAction(
  state: GameState,
  action: BotAction,
  rng: () => number = Math.random
): { state: GameState; success: boolean; gameOver: boolean } {
  let result;

  switch (action.type) {
    case 'select-apartment':
      result = selectApartment(state, action.apartment);
      break;
    case 'select-job':
      result = selectJob(state, action.job, action.schedule);
      break;
    case 'work':
      result = workShift(state, action.overtimeHours ?? 0, action.intensity ?? 'normal');
      break;
    case 'ask-promotion':
      result = askForPromotion(state, rng);
      break;
    case 'sleep':
      result = sleep(state, action.hours);
      break;
    case 'eat':
      result = eatMeal(state, action.mealType);
      break;
    case 'gym-workout':
      result = gymWorkout(state, state.gymMembership!, action.intensity);
      break;
    case 'park-walk':
      result = parkWalk(state);
      break;
    case 'study':
      result = study(state, action.intensity, action.hours);
      break;
    case 'buy-groceries':
      result = buyGroceries(
        state,
        action.optionId,
        action.meals,
        action.hungerPerMeal,
        action.cost
      );
      break;
    case 'select-gym':
      result = selectGymMembership(state, action.tier);
      break;
    case 'start-degree':
      result = startDegree(state, action.degree);
      break;
    case 'pay-tuition':
      result = payTuition(state, action.forNextSeason ?? false);
      break;
    case 'pass-time':
      result = passOneHour(state);
      break;
  }

  return {
    state: result!.state,
    success: result!.success,
    gameOver: result!.gameOver,
  };
}
