/**
 * Simulator module exports.
 */

export { runSimulation, createSeededRng } from './run-simulation';
export type {
  SimRunResult,
  SimTick,
  StatsSnapshot,
  InventorySnapshot,
  MoneyEvent,
} from './run-simulation';
export { buildLogContent, parseLogContent } from './logger';
export type { RunMetadata } from './logger';
export { selectNextAction, executeAction, getAvailableActions } from './decision-engine';
export type { BotAction } from './decision-engine';
export { DEFAULT_SMART_BOT_CONFIG } from './bot-types';
export type { CharacterPresetId, SmartBotConfig } from './bot-types';
