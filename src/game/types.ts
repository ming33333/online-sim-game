/**
 * Game engine types - pure TypeScript, no React/UI deps.
 */

export type LifeStage =
  | 'baby'
  | 'child'
  | 'teen'
  | 'young adult'
  | 'adult'
  | 'elderly';

export interface GameStats {
  year: number;
  dayOfYear: number;
  hourOfDay: number;
  birthYear: number;
  health: number;
  happiness: number;
  energy: number;
  hunger: number;
  money: number;
  beauty: number;
  smarts: number;
  fitness: number;
  social: number;
}

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

export type GamePhase =
  | 'selecting-home'
  | 'selecting-job'
  | 'free-play'
  | 'school'
  | 'home'
  | 'gym'
  | 'park'
  | 'grocery'
  | 'furniture';

export type DistrictName = 'Dewmist' | 'Semba' | 'Centerlight' | 'Ellum' | 'Marina';

export interface Apartment {
  id: string;
  name: string;
  description: string;
  rent: number;
  position: { x: number; y: number };
  district: DistrictName;
  color: string;
  bonus: { health?: number; happiness?: number; money?: number };
  bonusDescription: string;
}

export type JobSchedule = 'full-time' | 'part-time';

export type Degree = 'accounting' | 'engineering' | 'doctor' | 'finance';

export interface Job {
  id: string;
  name: string;
  description: string;
  salary: number;
  timeCommitmentMonths: number;
  workStartHour: number;
  workEndHourFull: number;
  workEndHourPart?: number;
  allowsPartTime?: boolean;
  /** District where this job’s workplace is (travel / map). */
  district: DistrictName;
  effect: { health?: number; happiness?: number };
  requiredDegree?: Degree;
  promotionTiers: string[];
}

export type EducationLevel = 'none' | 'in-progress' | 'completed';

export type GymTier = 'cheap' | 'normal' | 'luxury';

export type WorkIntensity = 'slack' | 'normal' | 'hard';
export type StudyIntensity = 'slack' | 'normal' | 'focus';
export type WorkoutIntensity = 'easy' | 'normal' | 'intense';

export interface CharacterPreset {
  id: string;
  name: string;
  description: string;
  startingMoney: number;
  beauty: number;
  smarts: number;
  fitness: number;
  social: number;
}

export interface GroceryOption {
  id: string;
  label: string;
  meals: number;
  hungerPerMeal: number;
  cost: number;
}

/** Full game state for engine and simulator */
export interface GameState {
  stats: GameStats;
  selectedApartment: Apartment | null;
  selectedJob: Job | null;
  jobSchedule: JobSchedule;
  jobTierIndex: number;
  jobTierStartedYear: number;
  jobTierStartedDayOfYear: number;
  jobStartedYear: number | null;
  jobStartedDayOfYear: number | null;
  jobPerformance: number;
  rentOverdue: boolean;
  rentOverdueSinceDay: number;
  lastRentPaidSeasonEndDay: number | null;
  educationLevel: EducationLevel;
  educationDegree: Degree | null;
  educationProgress: number;
  gymMembership: GymTier | null;
  gymMembershipStartDay: number | null;
  groceries: { regular: number; lux: number };
  diplomas: Degree[];
  tuitionPaidThroughSeasonEndDay: number | null;
  gamePhase: GamePhase;
  parkDistrict: DistrictName | null;
  groceryDistrict: DistrictName | null;
  eventLog: LogEntry[];
  activityCount: number;
  /** Cumulative in-game hours in current hunger/energy depletion streak (engine / simulator). */
  depletionHoursAccumulated: number;
}

export interface EngineResult {
  state: GameState;
  logEntries: LogEntry[];
  gameOver: boolean;
  success: boolean;
  blockReason?: string;
}
