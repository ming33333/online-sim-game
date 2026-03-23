/**
 * Run smart bot simulation: 2 years, maximize money.
 * Tracks: money made, inventory, stats over time.
 */

import { CHARACTER_PRESETS } from '../game/constants';
import { createInitialState, isGameOver } from '../game/engine';
import type { CharacterPreset, GameState, GameStats } from '../game/types';
import { executeAction, selectNextAction } from './decision-engine';
import { DEFAULT_SMART_BOT_CONFIG } from './bot-types';
import type { CharacterPresetId, SmartBotConfig } from './bot-types';

const DAYS_PER_YEAR = 112;

export interface InventorySnapshot {
  tick: number;
  day: number;
  groceriesRegular: number;
  groceriesLux: number;
  gymMembership: string | null;
  apartmentId: string | null;
  jobId: string | null;
  jobTier: number;
  diplomas: string[];
}

export interface StatsSnapshot {
  tick: number;
  day: number;
  health: number;
  happiness: number;
  energy: number;
  hunger: number;
  money: number;
  smarts: number;
}

export interface MoneyEvent {
  tick: number;
  day: number;
  moneyDelta: number;
  moneyAfter: number;
  actionType: string;
}

export interface SimTick {
  tick: number;
  year: number;
  dayOfYear: number;
  hourOfDay: number;
  day: number; // total days since start
  action: { type: string; params: Record<string, unknown> };
  stateBefore: GameStats;
  stateAfter: GameStats;
  moneyDelta: number; // stateAfter.money - stateBefore.money
  inventoryBefore: { regular: number; lux: number; gymMembership: string | null };
  inventoryAfter: { regular: number; lux: number; gymMembership: string | null };
  characterPresetId: CharacterPresetId;
  gameOver: boolean;
}

export interface SimRunResult {
  characterPreset: CharacterPreset;
  characterPresetId: CharacterPresetId;
  ticks: SimTick[];
  finalState: GameState;
  outcome: 'health-death' | 'evicted' | 'time-limit' | 'max-ticks' | 'unknown';
  /** Money made = final money - starting money */
  moneyMade: number;
  startingMoney: number;
  /** Stats over time (sampled every N ticks for charts) */
  statsOverTime: StatsSnapshot[];
  /** Inventory over time */
  inventoryOverTime: InventorySnapshot[];
  /** Every time money changed (gain or loss) */
  moneyEvents: MoneyEvent[];
}

export function createSeededRng(seed: number): () => number {
  return () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

function getTotalDays(state: GameState): number {
  return (
    (state.stats.year - 2000) * DAYS_PER_YEAR +
    (state.stats.dayOfYear - 1)
  );
}

function isPastTargetYears(state: GameState, targetYears: number): boolean {
  const totalDays = getTotalDays(state);
  return totalDays >= targetYears * DAYS_PER_YEAR;
}

export function runSimulation(
  options: {
    characterPresetId?: CharacterPresetId;
    seed?: number;
    config?: Partial<SmartBotConfig>;
  } = {}
): SimRunResult {
  const presetId = options.characterPresetId ?? 'middle';
  const preset =
    CHARACTER_PRESETS.find((p) => p.id === presetId) ?? CHARACTER_PRESETS[1];
  const config: SmartBotConfig = { ...DEFAULT_SMART_BOT_CONFIG, ...options.config };
  const rng = options.seed != null ? createSeededRng(options.seed) : Math.random;
  const maxTicks = 100000;

  let state = createInitialState(preset, rng);
  const startingMoney = state.stats.money;
  const ticks: SimTick[] = [];
  const statsOverTime: StatsSnapshot[] = [];
  const inventoryOverTime: InventorySnapshot[] = [];
  const moneyEvents: MoneyEvent[] = [];

  let tick = 0;
  const SAMPLE_EVERY = Math.max(1, Math.floor(maxTicks / 500));

  while (tick < maxTicks) {
    const gameOver = isGameOver(state);
    const timeLimitReached = isPastTargetYears(state, config.targetYears);

    if (gameOver || timeLimitReached) {
      break;
    }

    const action = selectNextAction(state, config, rng);
    if (!action) break;

    const stateBefore = { ...state.stats };
    const inventoryBefore = {
      regular: state.groceries.regular,
      lux: state.groceries.lux,
      gymMembership: state.gymMembership,
    };

    const { state: newState, success, gameOver: actionGameOver } = executeAction(
      state,
      action,
      rng
    );

    const inventoryAfter = {
      regular: newState.groceries.regular,
      lux: newState.groceries.lux,
      gymMembership: newState.gymMembership,
    };

    const actionParams: Record<string, unknown> = {};
    if (action.type === 'select-apartment') actionParams.apartmentId = action.apartment.id;
    if (action.type === 'select-job') {
      actionParams.jobId = action.job.id;
      actionParams.schedule = action.schedule;
    }
    if (action.type === 'work') {
      actionParams.overtimeHours = (action as { overtimeHours?: number }).overtimeHours;
      actionParams.intensity = (action as { intensity?: string }).intensity;
    }
    if (action.type === 'sleep') actionParams.hours = (action as { hours: number }).hours;
    if (action.type === 'eat') actionParams.mealType = (action as { mealType: string }).mealType;
    if (action.type === 'gym-workout') actionParams.intensity = (action as { intensity: string }).intensity;
    if (action.type === 'study') {
      actionParams.hours = (action as { hours: number }).hours;
      actionParams.intensity = (action as { intensity: string }).intensity;
    }
    if (action.type === 'buy-groceries') {
      actionParams.optionId = (action as { optionId: string }).optionId;
      actionParams.meals = (action as { meals: number }).meals;
    }
    if (action.type === 'select-gym') actionParams.tier = (action as { tier: string }).tier;
    if (action.type === 'start-degree') actionParams.degree = (action as { degree: string }).degree;

    const day = getTotalDays(newState);
    const moneyDelta = Math.round((newState.stats.money - stateBefore.money) * 100) / 100;
    if (moneyDelta !== 0) {
      moneyEvents.push({
        tick,
        day,
        moneyDelta,
        moneyAfter: newState.stats.money,
        actionType: action.type,
      });
    }
    ticks.push({
      tick,
      year: newState.stats.year,
      dayOfYear: newState.stats.dayOfYear,
      hourOfDay: newState.stats.hourOfDay,
      day,
      action: { type: action.type, params: actionParams },
      stateBefore,
      stateAfter: { ...newState.stats },
      moneyDelta,
      inventoryBefore,
      inventoryAfter,
      characterPresetId: presetId,
      gameOver: actionGameOver || isGameOver(newState),
    });

    if (tick % SAMPLE_EVERY === 0 || action.type === 'select-apartment' || action.type === 'select-job' || action.type === 'buy-groceries') {
      statsOverTime.push({
        tick,
        day,
        health: newState.stats.health,
        happiness: newState.stats.happiness,
        energy: newState.stats.energy,
        hunger: newState.stats.hunger,
        money: newState.stats.money,
        smarts: newState.stats.smarts,
      });
      inventoryOverTime.push({
        tick,
        day,
        groceriesRegular: newState.groceries.regular,
        groceriesLux: newState.groceries.lux,
        gymMembership: newState.gymMembership,
        apartmentId: newState.selectedApartment?.id ?? null,
        jobId: newState.selectedJob?.id ?? null,
        jobTier: newState.jobTierIndex,
        diplomas: [...newState.diplomas],
      });
    }

    state = newState;
    if (actionGameOver) break;
    tick++;
  }

  let outcome: SimRunResult['outcome'] = 'unknown';
  if (state.stats.health <= 0) outcome = 'health-death';
  else if (isPastTargetYears(state, config.targetYears)) outcome = 'time-limit';
  else if (tick >= maxTicks) outcome = 'max-ticks';
  else outcome = 'evicted';

  const moneyMade = state.stats.money - startingMoney;

  return {
    characterPreset: preset,
    characterPresetId: presetId,
    ticks,
    finalState: state,
    outcome,
    moneyMade,
    startingMoney,
    statsOverTime,
    inventoryOverTime,
    moneyEvents,
  };
}
