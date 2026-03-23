/**
 * Single smart bot: maximizes money in 2 years via degree → job → promotions.
 * Survives by maintaining health, hunger, energy.
 */

export type CharacterPresetId = 'privileged' | 'middle' | 'struggling';

export interface SmartBotConfig {
  /** Goal: maximize money in this many game years */
  targetYears: number;
  /** Survival thresholds - bot acts when below these */
  hungerThreshold: number;
  energyThreshold: number;
  healthThreshold: number;
  /** Groceries: buy when meals below this */
  minMealsBeforeBuy: number;
}

export const DEFAULT_SMART_BOT_CONFIG: SmartBotConfig = {
  targetYears: 2,
  hungerThreshold: 45,
  energyThreshold: 35,
  healthThreshold: 55,
  minMealsBeforeBuy: 5,
};
