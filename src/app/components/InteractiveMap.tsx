import { motion } from 'motion/react';
import { Home, MapPin, Briefcase, Dumbbell, Trees, ShoppingCart, CircleUser } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import React, { useState, useEffect, useRef } from 'react';
import type { GameStats, Apartment, Job, Degree, JobSchedule, DistrictName } from './LifeSimGame';
type EducationLevel = 'none' | 'in-progress' | 'completed';
import { JobCenter } from './JobCenter';
import { SchoolView } from './SchoolView';
import { HomeView } from './HomeView';
import { GymView } from './GymView';
import type { GymTier } from './GymView';
import { ParkView } from './ParkView';
import { GroceryStoreView } from './GroceryStoreView';
import { FurnitureStoreView } from './FurnitureStoreView';
import type { HomeFurnitureState } from '../lib/furniture';
import type { BackpackId, SnackId } from '../lib/inventory';
import type { WeatherConditions } from '../lib/weather';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { fmt2, formatMoney } from '../lib/formatNumber';
import type { SkincareId, HaircutId } from '../lib/beautyCare';
import {
  gameChromePanel,
  gameChromePanelHeader,
  gameChromePhaseCardHeader,
  gameChromePanelMuted,
  gameChromeMapCanvas,
} from '../lib/gameChrome';
import type { NpcId } from '../lib/relationships';
import { GYM_TIER_BY_DISTRICT } from '../../game/constants';
import { DISTRICT_POSITIONS, DISTRICT_NAMES, TRACK_GRAPH } from '../lib/werdredMapLayout';
import { WerdredMapTrackLayer } from './WerdredMapTrackLayer';

/** Map column fills above the bottom stats hub; inner area scrolls when a phase UI is tall. */
function PhaseScrollRoot({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-full min-h-0 w-full min-w-0 flex flex-col overflow-hidden">
      <div className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden overscroll-y-contain">
        {children}
      </div>
    </div>
  );
}

type MapPhase =
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

export interface InteractiveMapProps {
  stats: GameStats;
  onActivityComplete: (
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
    daysPassed: number
  ) => void;
  gamePhase: MapPhase;
  apartments: Apartment[];
  jobs: Job[];
  selectedJob: Job | null;
  onSelectApartment: (apartment: Apartment) => void;
  onSelectJob: (job: Job, schedule?: JobSchedule) => void;
  onWorkShift: (intensity: 'slack' | 'normal' | 'hard', workHours: number) => void;
  onWorkOvertime: (intensity: 'slack' | 'normal' | 'hard') => void;
  workHoursPerShift: number;
  /** Max hours on work slider (1–12, capped by shift availability) */
  maxWorkHours: number;
  canWorkNow: boolean;
  canWorkOvertimeNow: boolean;
  isFirstDayOfWork: boolean;
  jobSchedule: JobSchedule;
  setJobSchedule: (s: JobSchedule) => void;
  getSalaryPerDay: (job: Job) => number;
  getSalaryPerHour: (job: Job) => number;
  getEffectiveSalary: (job: Job) => number;
  getCurrentJobTitle: (job: Job) => string;
  promotionCheck: { allowed: boolean; reason?: string; chance?: number };
  onAskForPromotion: () => void;
  onCafeteriaMeal?: (hunger: number, cost: number, eatHours: number, label: string) => void;
  onGoToSchool: () => void;
  onGoToJobSelection: () => void;
  onGoToWork: () => void;
  onGoToHomeSelection: () => void;
  onGoToHome: () => void;
  onGoToGym: (district: 'Dewmist' | 'Semba' | 'Marina') => void;
  onGoToPark: (district: DistrictName) => void;
  onGoToGrocery: (district: DistrictName) => void;
  onGoToFurniture: (district: DistrictName) => void;
  onGoToCityView: () => void;
  onOpenMapOverlay: () => void;
  onBuyGroceries: (option: string, meals: number, hungerPerMeal: number, cost: number) => void;
  onBuyFastFood: (name: string, hungerGain: number, cost: number, healthPenalty: number) => void;
  backpackId: BackpackId | null;
  snackCounts: Record<SnackId, number>;
  togoCarried: { regular: number; lux: number };
  /** Snacks + to-go meals (space units) currently in the backpack */
  backpackSpaceUsed: number;
  backpackCapacity: number;
  onBuyBackpack: (id: BackpackId) => void;
  onBuySnack: (id: SnackId) => void;
  skincareDoses: Record<SkincareId, number>;
  onBuySkincare: (id: SkincareId) => void;
  onGetHaircut: (id: HaircutId) => void;
  haircutSalon: { canCut: boolean; daysRemaining: number; nextDateLabel: string };
  educationLevel: EducationLevel;
  educationDegree: Degree | null;
  educationProgress: number;
  currentMoney: number;
  currentRent: number;
  rentOverdue: boolean;
  universityHousingStudentRent: number;
  dayOfYear: number;
  onStartDegree: (degree: Degree) => boolean;
  onStudy: (intensity: 'slack' | 'normal' | 'focus', hours: number) => void;
  selectedApartment: Apartment | null;
  parkDistrict: DistrictName | null;
  groceryDistrict: DistrictName | null;
  furnitureDistrict: DistrictName | null;
  /** Gym building location (Budget / FitZone / Elite — one tier per district). */
  gymDistrict: 'Dewmist' | 'Semba' | 'Marina';
  schoolCampusOpen: boolean;
  schoolCampusClosedReason: string;
  /** Tuition for current 28-day season already paid (phone or enroll). */
  tuitionPaidCurrentSeason: boolean;
  /** Job Office (Marina) accepts visits 8 AM–6 PM only */
  jobOfficeOpen: boolean;
  onQuitJob: () => void;
  onChillAtSchool: (hours: number) => void;
  onPublicNapAtSchool: (hours: number) => void;
  onEatSchoolCafe: (name: string, hungerGain: number, cost: number, healthPenalty: number) => void;
  gymMembership: GymTier | null;
  onSelectGymMembership: (tier: GymTier) => void;
  onGymWorkout: (tier: GymTier, intensity: 'easy' | 'normal' | 'intense') => void;
  onGymChill: (hours: number) => void;
  onBuyGymSnack: (snackId: SnackId, price: number) => void;
  onParkWalk: () => void;
  onSleep: (hours: number) => void;
  onEatMeal: (type: 'regular' | 'lux') => void;
  onEatSnack: (id: SnackId) => void;
  onChill: (hours: number) => void;
  onWatchTv: (hours: number) => void;
  onBuyFurniture: (itemId: string) => void;
  onOpenFurnitureSell: () => void;
  homeFurniture: HomeFurnitureState;
  groceryFreshness: { regular: number; lux: number };
  hasFridge: boolean;
  watchHappinessPerHour: number;
  isLiveWithParents: boolean;
  /** True when evicted / no lease (not initial home selection) */
  isHomeless?: boolean;
  groceries: { regular: number; lux: number };
  fridgeGroceries: { regular: number; lux: number };
  counterGroceries: { regular: number; lux: number };
  fridgeMealCapacity: number | null;
  togoHome: { regular: number; lux: number };
  togoFreshHome: { regular: number; lux: number };
  onPrepareTogo: (type: 'regular' | 'lux') => void;
  onStashTogo: (type: 'regular' | 'lux') => void;
  currentWeather: WeatherConditions | null;
  getTravelMinutes: (targetPhase: MapPhase, destDistrict?: DistrictName) => number;
  mapOverlayOpen?: boolean;
  onCloseMapOverlay?: () => void;
  pendingGoHomeAnimation?: boolean;
  onGoHomeAnimationDone?: () => void;
  pendingGoToSchoolAnimation?: boolean;
  onGoToSchoolAnimationDone?: () => void;
  npcInteractions: Record<NpcId, number>;
  datingPartnerId: NpcId | null;
  onTalkToNpc: (id: NpcId) => void;
  onStartDating: (id: NpcId) => void;
  /** First visit to school: welcome tutorial until dismissed. */
  schoolTutorialOpen: boolean;
  onDismissSchoolTutorial: () => void;
  /** Right after tutorial: introduce campus NPCs (once per playthrough). */
  schoolMeetClassmatesOpen: boolean;
  onDismissSchoolMeetClassmates: () => void;
}

function nearestDistrict(pos: { x: number; y: number }): DistrictName {
  let best: DistrictName = 'Centerlight';
  let minD = Infinity;
  for (const d of DISTRICT_NAMES) {
    const p = DISTRICT_POSITIONS[d];
    const d2 = (p.x - pos.x) ** 2 + (p.y - pos.y) ** 2;
    if (d2 < minD) {
      minD = d2;
      best = d;
    }
  }
  return best;
}

function getPathAlongTrack(fromPos: { x: number; y: number }, toPos: { x: number; y: number }): { x: number; y: number }[] {
  const fromD = nearestDistrict(fromPos);
  const toD = nearestDistrict(toPos);
  if (fromD === toD) return [fromPos, toPos];
  const queue: DistrictName[] = [fromD];
  const parent: Record<string, DistrictName> = { [fromD]: fromD };
  while (queue.length) {
    const cur = queue.shift()!;
    if (cur === toD) break;
    for (const next of TRACK_GRAPH[cur] || []) {
      if (parent[next] == null) {
        parent[next] = cur;
        queue.push(next);
      }
    }
  }
  const pathNames: DistrictName[] = [];
  for (let d: DistrictName | undefined = toD; d; d = parent[d] === d ? undefined : parent[d]) pathNames.unshift(d);
  return pathNames.map((d) => DISTRICT_POSITIONS[d]);
}

type DistrictOption = {
  label: string;
  phase: MapPhase;
  navigate: () => void;
  disabled?: boolean;
  disabledReason?: string;
  destDistrict?: DistrictName;
};
const getDistrictOptions = (
  district: DistrictName,
  selectedApartment: Apartment | null,
  selectedJob: Job | null,
  handlers: {
    onGoToSchool: () => void;
    schoolCampusOpen: boolean;
    schoolCampusClosedReason: string;
    onGoToHomeSelection: () => void;
    onGoToHome: () => void;
    onGoToGym: (district: 'Dewmist' | 'Semba' | 'Marina') => void;
    onGoToPark: (d: DistrictName) => void;
    onGoToGrocery: (d: DistrictName) => void;
    onGoToFurniture: (d: DistrictName) => void;
    onGoToJobSelection: () => void;
    onGoToWork: () => void;
    jobOfficeOpen: boolean;
  }
): DistrictOption[] => {
  const workplaceOption: DistrictOption[] =
    selectedJob && district === selectedJob.district
      ? [{ label: 'Workplace', phase: 'work', navigate: handlers.onGoToWork }]
      : [];
  const homeOption: DistrictOption[] =
    selectedApartment && district === selectedApartment.district
      ? [{ label: 'Home', phase: 'home', navigate: handlers.onGoToHome }]
      : [];
  const parkOption: DistrictOption[] =
    district === 'Centerlight'
      ? []
      : [
          {
            label: 'Park',
            phase: 'park',
            navigate: () => handlers.onGoToPark(district),
            destDistrict: district,
          },
        ];
  const furnitureOption: DistrictOption[] =
    district === 'Centerlight'
      ? [
          {
            label: 'Furniture Store',
            phase: 'furniture',
            navigate: () => handlers.onGoToFurniture('Centerlight'),
            destDistrict: 'Centerlight',
          },
        ]
      : [];
  const base: DistrictOption[] = [
    ...homeOption,
    ...parkOption,
    {
      label: 'Grocery Store',
      phase: 'grocery',
      navigate: () => handlers.onGoToGrocery(district),
      destDistrict: district,
    },
    ...furnitureOption,
  ];
  const gymForDistrict = (): DistrictOption | null => {
    if (district === 'Dewmist')
      return {
        label: 'Gym (Budget)',
        phase: 'gym',
        navigate: () => handlers.onGoToGym('Dewmist'),
        destDistrict: 'Dewmist',
      };
    if (district === 'Semba')
      return {
        label: 'Gym (Standard)',
        phase: 'gym',
        navigate: () => handlers.onGoToGym('Semba'),
        destDistrict: 'Semba',
      };
    if (district === 'Marina')
      return {
        label: 'Gym (Premium)',
        phase: 'gym',
        navigate: () => handlers.onGoToGym('Marina'),
        destDistrict: 'Marina',
      };
    return null;
  };
  const gymOpt = gymForDistrict();
  if (district === 'Dewmist')
    return [
      {
        label: 'School',
        phase: 'school',
        navigate: handlers.onGoToSchool,
        disabled: !handlers.schoolCampusOpen,
        disabledReason: handlers.schoolCampusClosedReason,
      },
      ...workplaceOption,
      ...(gymOpt ? [gymOpt] : []),
      ...base,
    ];
  if (district === 'Semba')
    return [...(gymOpt ? [gymOpt] : []), ...workplaceOption, ...base];
  if (district === 'Marina')
    return [
      {
        label: 'Job Office',
        phase: 'selecting-job',
        navigate: handlers.onGoToJobSelection,
        disabled: !handlers.jobOfficeOpen,
        disabledReason: 'Job Office is open 8 AM–6 PM daily.',
      },
      ...workplaceOption,
      ...(gymOpt ? [gymOpt] : []),
      ...base,
    ];
  if (district === 'Centerlight')
    return [
      ...workplaceOption,
      { label: 'Housing Office', phase: 'selecting-home', navigate: handlers.onGoToHomeSelection },
      ...base,
    ];
  return [...workplaceOption, ...base];
};

const PHASE_TO_POSITION: Record<
  Exclude<MapPhase, 'home' | 'park' | 'grocery' | 'furniture' | 'work' | 'gym'>,
  { x: number; y: number }
> = {
  'free-play': DISTRICT_POSITIONS.Centerlight,
  school: DISTRICT_POSITIONS.Dewmist,
  'selecting-home': DISTRICT_POSITIONS.Centerlight,
  // Job Office (pick/accept a job offer)
  'selecting-job': DISTRICT_POSITIONS.Marina,
};

function getMapPosition(
  phase: MapPhase,
  homeDistrict?: DistrictName,
  parkDistrict?: DistrictName | null,
  groceryDistrict?: DistrictName | null,
  furnitureDistrict?: DistrictName | null,
  workDistrict?: DistrictName | null,
  gymDistrict?: 'Dewmist' | 'Semba' | 'Marina' | null
): { x: number; y: number } {
  if (phase === 'home' && homeDistrict) return DISTRICT_POSITIONS[homeDistrict];
  if (phase === 'home') return DISTRICT_POSITIONS.Centerlight;
  if (phase === 'gym') return DISTRICT_POSITIONS[gymDistrict ?? 'Semba'];
  if (phase === 'park') return DISTRICT_POSITIONS[parkDistrict ?? 'Ellum'];
  if (phase === 'grocery') return DISTRICT_POSITIONS[groceryDistrict ?? 'Centerlight'];
  if (phase === 'furniture') return DISTRICT_POSITIONS[furnitureDistrict ?? 'Centerlight'];
  if (phase === 'work') return DISTRICT_POSITIONS[workDistrict ?? 'Centerlight'];
  return PHASE_TO_POSITION[phase];
}

export function InteractiveMap({
  stats,
  onActivityComplete,
  gamePhase,
  apartments,
  jobs,
  selectedJob,
  onSelectApartment,
  onSelectJob,
  onWorkShift,
  onWorkOvertime,
  workHoursPerShift,
  maxWorkHours,
  canWorkNow,
  canWorkOvertimeNow,
  isFirstDayOfWork,
  jobSchedule,
  setJobSchedule,
  getSalaryPerDay,
  getSalaryPerHour,
  getEffectiveSalary,
  getCurrentJobTitle,
  promotionCheck,
  onAskForPromotion,
  onCafeteriaMeal,
  onGoToSchool,
  onGoToJobSelection,
  onGoToWork,
  onGoToHomeSelection,
  onGoToHome,
  onGoToGym,
  onGoToPark,
  onGoToGrocery,
  onGoToFurniture,
  onGoToCityView,
  onOpenMapOverlay,
  onBuyGroceries,
  onBuyFastFood,
  backpackId,
  snackCounts,
  togoCarried,
  backpackSpaceUsed,
  backpackCapacity,
  onBuyBackpack,
  onBuySnack,
  skincareDoses,
  onBuySkincare,
  onGetHaircut,
  haircutSalon,
  educationLevel,
  educationDegree,
  educationProgress,
  currentMoney,
  currentRent,
  universityHousingStudentRent,
  dayOfYear,
  onStartDegree,
  onStudy,
  selectedApartment,
  gymMembership,
  onSelectGymMembership,
  onGymWorkout,
  onGymChill,
  onBuyGymSnack,
  onParkWalk,
  onSleep,
  onEatMeal,
  onEatSnack,
  onChill,
  onWatchTv,
  onBuyFurniture,
  onOpenFurnitureSell,
  homeFurniture,
  groceryFreshness,
  hasFridge,
  watchHappinessPerHour,
  isLiveWithParents,
  isHomeless = false,
  groceries,
  fridgeGroceries,
  counterGroceries,
  fridgeMealCapacity,
  togoHome,
  togoFreshHome,
  onPrepareTogo,
  onStashTogo,
  currentWeather,
  getTravelMinutes,
  parkDistrict,
  groceryDistrict,
  furnitureDistrict,
  gymDistrict,
  schoolCampusOpen,
  schoolCampusClosedReason,
  tuitionPaidCurrentSeason,
  jobOfficeOpen,
  onQuitJob,
  onChillAtSchool,
  onPublicNapAtSchool,
  onEatSchoolCafe,
  mapOverlayOpen = false,
  onCloseMapOverlay,
  pendingGoHomeAnimation = false,
  onGoHomeAnimationDone,
  pendingGoToSchoolAnimation = false,
  onGoToSchoolAnimationDone,
  npcInteractions,
  datingPartnerId,
  onTalkToNpc,
  onStartDating,
  schoolTutorialOpen,
  onDismissSchoolTutorial,
  schoolMeetClassmatesOpen,
  onDismissSchoolMeetClassmates,
}: InteractiveMapProps) {
  const [selectedItem, setSelectedItem] = useState<Apartment | Job | null>(null);
  const [animatingTo, setAnimatingTo] = useState<MapPhase | null>(null);
  const [animatingDestDistrict, setAnimatingDestDistrict] = useState<DistrictName | null>(null);
  const [animatingPath, setAnimatingPath] = useState<{ x: number; y: number }[] | null>(null);

  /** Home selection map: which district’s pins are shown (hover / tap a district label). */
  const [homeHoveredDistrict, setHomeHoveredDistrict] = useState<DistrictName | null>(null);
  const homeDistrictHoverLeaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHomeDistrictHoverTimer = () => {
    if (homeDistrictHoverLeaveTimerRef.current != null) {
      clearTimeout(homeDistrictHoverLeaveTimerRef.current);
      homeDistrictHoverLeaveTimerRef.current = null;
    }
  };

  const beginHomeDistrictHover = (d: DistrictName) => {
    clearHomeDistrictHoverTimer();
    setHomeHoveredDistrict(d);
  };

  const endHomeDistrictHoverSoon = () => {
    clearHomeDistrictHoverTimer();
    homeDistrictHoverLeaveTimerRef.current = setTimeout(() => {
      setHomeHoveredDistrict(null);
      homeDistrictHoverLeaveTimerRef.current = null;
    }, 220);
  };

  useEffect(() => () => clearHomeDistrictHoverTimer(), []);

  useEffect(() => {
    if (gamePhase !== 'selecting-home') {
      clearHomeDistrictHoverTimer();
      setHomeHoveredDistrict(null);
    }
  }, [gamePhase]);

  const getTravelAnimDuration = (target: MapPhase, destDistrict?: DistrictName) =>
    Math.min(0.7, Math.max(0.3, getTravelMinutes(target, destDistrict) / 80)); // 20 min = 0.25s, 40 min = 0.5s

  const handleLocationClick = (target: MapPhase, navigate: () => void, destDistrict?: DistrictName) => {
    if (animatingTo || animatingPath) return;
    if (gamePhase === target) {
      if (target === 'park' && destDistrict === parkDistrict) return;
      if (target === 'grocery' && destDistrict === groceryDistrict) return;
      if (target === 'furniture' && destDistrict === furnitureDistrict) return;
      if (target === 'gym' && destDistrict === gymDistrict) return;
      if (target !== 'park' && target !== 'grocery' && target !== 'furniture' && target !== 'gym') return;
    }
    const fromPos = getMapPosition(
      gamePhase,
      selectedApartment?.district,
      parkDistrict,
      groceryDistrict,
      furnitureDistrict,
      gamePhase === 'work' ? selectedJob?.district : undefined,
      gamePhase === 'gym' ? gymDistrict : undefined
    );
    const toPos = getMapPosition(
      target,
      selectedApartment?.district,
      target === 'park' ? (destDistrict ?? parkDistrict) : parkDistrict,
      target === 'grocery' ? (destDistrict ?? groceryDistrict) : groceryDistrict,
      target === 'furniture' ? (destDistrict ?? furnitureDistrict) : furnitureDistrict,
      target === 'work' ? selectedJob?.district : undefined,
      target === 'gym' ? (destDistrict as 'Dewmist' | 'Semba' | 'Marina' | undefined) ?? gymDistrict : undefined
    );
    const path = getPathAlongTrack(fromPos, toPos);
    setAnimatingTo(target);
    setAnimatingDestDistrict(destDistrict ?? null);
    setAnimatingPath(path.length > 1 ? path : null);
    const durationMs = getTravelAnimDuration(target, destDistrict) * 1000;
    setTimeout(() => {
      navigate();
      setAnimatingTo(null);
      setAnimatingDestDistrict(null);
      setAnimatingPath(null);
      if (mapOverlayOpen && onCloseMapOverlay) onCloseMapOverlay();
    }, durationMs);
  };

  useEffect(() => {
    if (!pendingGoHomeAnimation || animatingTo || animatingPath || gamePhase === 'home') return;
    const fromPos = getMapPosition(
      gamePhase,
      selectedApartment?.district,
      parkDistrict,
      groceryDistrict,
      furnitureDistrict,
      gamePhase === 'work' ? selectedJob?.district : undefined,
      gamePhase === 'gym' ? gymDistrict : undefined
    );
    const toPos = getMapPosition(
      'home',
      selectedApartment?.district,
      parkDistrict,
      groceryDistrict,
      furnitureDistrict,
      undefined,
      undefined
    );
    const path = getPathAlongTrack(fromPos, toPos);
    setAnimatingTo('home');
    setAnimatingDestDistrict(null);
    setAnimatingPath(path.length > 1 ? path : null);
    const durationMs = getTravelAnimDuration('home') * 1000;
    const id = setTimeout(() => {
      onGoToHome();
      setAnimatingTo(null);
      setAnimatingDestDistrict(null);
      setAnimatingPath(null);
      if (mapOverlayOpen && onCloseMapOverlay) onCloseMapOverlay();
      onGoHomeAnimationDone?.();
    }, durationMs);
    return () => clearTimeout(id);
  }, [pendingGoHomeAnimation]);

  useEffect(() => {
    if (!pendingGoToSchoolAnimation || animatingTo || animatingPath || gamePhase === 'school') return;
    const fromPos = getMapPosition(
      gamePhase,
      selectedApartment?.district,
      parkDistrict,
      groceryDistrict,
      furnitureDistrict,
      gamePhase === 'work' ? selectedJob?.district : undefined,
      gamePhase === 'gym' ? gymDistrict : undefined
    );
    const toPos = getMapPosition(
      'school',
      selectedApartment?.district,
      parkDistrict,
      groceryDistrict,
      furnitureDistrict,
      undefined,
      undefined
    );
    const path = getPathAlongTrack(fromPos, toPos);
    setAnimatingTo('school');
    setAnimatingDestDistrict(null);
    setAnimatingPath(path.length > 1 ? path : null);
    const durationMs = getTravelAnimDuration('school') * 1000;
    const id = setTimeout(() => {
      onGoToSchool();
      setAnimatingTo(null);
      setAnimatingDestDistrict(null);
      setAnimatingPath(null);
      if (mapOverlayOpen && onCloseMapOverlay) onCloseMapOverlay();
      onGoToSchoolAnimationDone?.();
    }, durationMs);
    return () => clearTimeout(id);
  }, [pendingGoToSchoolAnimation]);

  const travelTooltip = (label: string, target: MapPhase, destDistrict?: DistrictName) => {
    const mins = getTravelMinutes(target, destDistrict);
    return mins === 0 ? `${label} · You are here` : `${label} · ${mins} min from here`;
  };

  // Map overlay - show map from any location (skip phase-specific views)
  const showMapOverlay = mapOverlayOpen;

  // Apartment Selection Phase (skip when map overlay open)
  if (!showMapOverlay && gamePhase === 'selecting-home') {
    const selectedApartmentDistrict =
      selectedItem && 'rent' in selectedItem ? selectedItem.district : null;
    const showHomePin = (apt: Apartment) =>
      homeHoveredDistrict === apt.district ||
      (selectedApartmentDistrict != null && selectedApartmentDistrict === apt.district);

    return (
      <PhaseScrollRoot>
      <Card className={`${gameChromePanel} w-full min-h-full flex flex-col`}>
      <CardHeader className={`flex-shrink-0 py-2 px-3 ${gameChromePhaseCardHeader}`}>
        <CardTitle className="text-base text-slate-900">Choose Your Home in Werdred</CardTitle>
        <CardDescription className="text-xs text-slate-700">
          Hover or tap a district to show homes there, then pick a house for rent and bonuses. Your district is your home
          base on the map.
        </CardDescription>
      </CardHeader>
        <CardContent className="flex-1 min-h-0 flex flex-col md:flex-row gap-2 pt-0 px-2 pb-2">
          <div
            className={`relative w-full md:flex-1 min-h-[min(52vh,400px)] md:min-h-[300px] ${gameChromeMapCanvas} overflow-hidden shrink-0`}
          >
            <WerdredMapTrackLayer />
            {DISTRICT_NAMES.map((district) => {
              const pos = DISTRICT_POSITIONS[district];
              const pinsActive =
                homeHoveredDistrict === district || selectedApartmentDistrict === district;
              return (
                <button
                  key={district}
                  type="button"
                  className={`absolute z-[3] rounded-xl border px-2.5 py-1.5 min-w-[3.5rem] flex flex-col items-center justify-center text-left transition-colors shadow-md ${
                    pinsActive
                      ? 'bg-white border-sky-600 ring-2 ring-sky-500/50'
                      : 'bg-[#eef2f8]/95 border-[#1a2332] hover:bg-white hover:border-sky-500/80'
                  }`}
                  style={{
                    left: `${pos.x}%`,
                    top: `${pos.y}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  aria-expanded={pinsActive}
                  aria-label={`${district} district. ${pinsActive ? 'Homes shown' : 'Show homes in this district'}.`}
                  onMouseEnter={() => beginHomeDistrictHover(district)}
                  onMouseLeave={endHomeDistrictHoverSoon}
                  onFocus={() => beginHomeDistrictHover(district)}
                  onClick={() => {
                    clearHomeDistrictHoverTimer();
                    setHomeHoveredDistrict((prev) => (prev === district ? null : district));
                  }}
                >
                  <span className="text-[11px] font-bold text-slate-900 leading-tight text-center">{district}</span>
                  <span className="text-[9px] font-medium text-slate-600 leading-none mt-0.5">district</span>
                </button>
              );
            })}
            {apartments.map((apartment) => {
              const isSelected = selectedItem?.id === apartment.id;
              if (!showHomePin(apartment)) return null;
              return (
                <div
                  key={apartment.id}
                  className={`absolute z-[4] cursor-pointer transition-all duration-200 hover:brightness-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-300 ${
                    isSelected ? 'scale-[1.03]' : ''
                  }`}
                  style={{
                    left: `${apartment.position.x}%`,
                    top: `${apartment.position.y}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  onMouseEnter={() => beginHomeDistrictHover(apartment.district)}
                  onMouseLeave={endHomeDistrictHoverSoon}
                  onFocus={() => beginHomeDistrictHover(apartment.district)}
                  onBlur={endHomeDistrictHoverSoon}
                  onClick={() => setSelectedItem(apartment)}
                  onKeyDown={(e) => e.key === 'Enter' && setSelectedItem(apartment)}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                >
                  <div
                    className={`bg-gradient-to-br ${apartment.color} p-3 rounded-none border-[3px] ${
                      isSelected ? 'ring-2 ring-sky-500 ring-offset-2 ring-offset-[#d8e0eb]' : ''
                    } border-[#1a2332] shadow-[3px_3px_0_0_rgba(15,23,42,0.35)]`}
                  >
                    <Home className="size-6 text-white drop-shadow-sm" />
                  </div>
                  <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 flex flex-col items-center gap-0.5 pointer-events-none">
                    <div className="whitespace-nowrap border-[2px] border-[#1a2332] bg-[#1a2332] px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-[2px_2px_0_0_rgba(15,23,42,0.4)] max-w-[9rem] truncate text-center">
                      {apartment.name}
                    </div>
                    <div className="text-[10px] font-bold text-slate-900 bg-white/95 border border-[#1a2332] px-1.5 py-0.5 shadow-sm">
                      {apartment.district}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="w-full md:w-[min(100%,22rem)] md:max-w-sm flex flex-col gap-2 min-h-0 md:overflow-y-auto shrink-0">
          {/* Selected Apartment Details */}
          {selectedItem && 'rent' in selectedItem && (() => {
            const isUniversityHousing = selectedItem.id === 'university-housing';
            const isEnrolled = educationLevel === 'in-progress';
            const effectiveRent = isUniversityHousing && isEnrolled ? universityHousingStudentRent : selectedItem.rent;
            const weeklyRent = effectiveRent > 0 ? Math.round((effectiveRent / 4) * 100) / 100 : 0;
            const WEEK_END_DAYS = [7, 14, 21, 28, 35, 42, 49, 56, 63, 70, 77, 84, 91, 98, 105, 112];
            const weekEnd = WEEK_END_DAYS.find((d) => d >= dayOfYear) ?? 112;
            const daysLeftInWeek = weekEnd - dayOfYear + 1;
            const proratedMoveIn =
              weeklyRent > 0 ? Math.round((daysLeftInWeek / 7) * weeklyRent * 100) / 100 : 0;
            const isCurrentHome = selectedApartment?.id === selectedItem.id;
            const cantAffordMove =
              effectiveRent > 0 && stats.money < proratedMoveIn;
            const moveInDisabled = isCurrentHome || cantAffordMove;
            return (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`${gameChromePanelMuted} p-3 sm:p-4 space-y-3`}
            >
              <h3 className="text-lg sm:text-xl font-bold text-slate-900">{selectedItem.name}</h3>
              <div className="rounded-none border-[2px] border-[#1a2332] bg-[#d8e0eb] px-2.5 py-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">District</p>
                <p className="text-base font-bold text-slate-900">{selectedItem.district}</p>
                <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                  The map and travel times use this neighborhood as your home base.
                </p>
              </div>
              <p className="text-sm text-slate-700 leading-snug">{selectedItem.description}</p>
              <div className="rounded-none border-[3px] border-[#1a2332] overflow-hidden shadow-[2px_2px_0_0_rgba(15,23,42,0.2)]">
                <div className={`px-3 py-2 ${gameChromePanelHeader}`}>
                  <div className="text-base sm:text-lg font-bold text-slate-900">
                    ${weeklyRent}/week
                    {isUniversityHousing && isEnrolled && (
                      <span className="ml-2 text-xs sm:text-sm font-semibold text-emerald-800">(student rate)</span>
                    )}
                  </div>
                  <div className="text-[11px] sm:text-xs text-slate-700 mt-0.5">
                    Listed ${effectiveRent} per 28-day season (÷4 for weekly rent)
                  </div>
                </div>
                <div className="bg-[#d8e0eb]/95 px-3 py-3 space-y-2 border-t-[3px] border-[#1a2332]">
                  {selectedItem.bonus.health != null && selectedItem.bonus.health !== 0 && (
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded text-sm ${
                        selectedItem.bonus.health > 0
                          ? 'bg-red-100 text-red-700'
                          : 'bg-red-200 text-red-800'
                      }`}>
                        ❤️ Health {selectedItem.bonus.health > 0 ? '+' : ''}{fmt2(Number(selectedItem.bonus.health))}
                      </span>
                    </div>
                  )}
                  {selectedItem.bonus.happiness != null && selectedItem.bonus.happiness !== 0 && (
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded text-sm ${
                        selectedItem.bonus.happiness > 0
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-yellow-200 text-yellow-800'
                      }`}>
                        😊 Happiness {selectedItem.bonus.happiness > 0 ? '+' : ''}{fmt2(Number(selectedItem.bonus.happiness))}
                      </span>
                    </div>
                  )}
                  {selectedItem.bonus.money && (
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded text-sm ${
                        selectedItem.bonus.money > 0
                          ? 'bg-green-100 text-green-700'
                          : 'bg-green-200 text-green-800'
                      }`}>
                        💰 ${selectedItem.bonus.money} (first season's rent)
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-block w-full">
                    <Button
                      onClick={() => onSelectApartment(selectedItem)}
                      disabled={moveInDisabled}
                      className="w-full rounded-none border-[3px] border-[#1a2332] py-5 text-sm font-semibold text-white shadow-[4px_4px_0_0_#0f172a] bg-gradient-to-r from-slate-600 via-sky-600 to-cyan-500 hover:from-slate-700 hover:via-sky-700 hover:to-cyan-600 active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0_0_#0f172a] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:translate-x-0 disabled:active:translate-y-0"
                      size="lg"
                    >
                      {isCurrentHome
                        ? 'You live here'
                        : cantAffordMove
                          ? "Can't afford"
                          : 'Move In Here'}
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs text-left">
                  {isCurrentHome
                    ? 'You already lease this apartment.'
                    : cantAffordMove
                      ? `Need $${formatMoney(proratedMoveIn)} prorated move-in (you have $${formatMoney(stats.money)}).`
                      : weeklyRent > 0
                        ? `Pay $${formatMoney(proratedMoveIn)} for the rest of this week and move in.`
                        : 'Move in here.'}
                </TooltipContent>
              </Tooltip>
            </motion.div>
          );
          })()}

          {!selectedItem && (
            <div className="text-center p-5 sm:p-6 rounded-none border-[3px] border-dashed border-[#1a2332]/45 bg-[#e6ecf4] shadow-[2px_2px_0_0_rgba(15,23,42,0.12)]">
              <MapPin className="size-11 sm:size-12 mx-auto text-slate-500 mb-2" />
              <p className="text-sm text-slate-700 font-medium">Hover or tap a district first</p>
              <p className="text-xs text-slate-600 mt-1">Then choose a home pin in that neighborhood.</p>
            </div>
          )}
          </div>
        </CardContent>
      </Card>
      </PhaseScrollRoot>
    );
  }

  // Home - Sleep & Eat
  if (!showMapOverlay && gamePhase === 'home') {
    return (
      <PhaseScrollRoot>
      <HomeView
        onOpenMapOverlay={onOpenMapOverlay}
        apartmentName={isHomeless ? 'No housing' : (selectedApartment?.name ?? 'Your Home')}
        apartmentRent={selectedApartment?.rent ?? 0}
        isLiveWithParents={isLiveWithParents}
        isHomeless={isHomeless}
        currentEnergy={stats.energy}
        currentHunger={stats.hunger}
        groceries={groceries}
        fridgeGroceries={fridgeGroceries}
        counterGroceries={counterGroceries}
        fridgeMealCapacity={fridgeMealCapacity}
        togoHome={togoHome}
        togoFreshHome={togoFreshHome}
        onPrepareTogo={onPrepareTogo}
        onStashTogo={onStashTogo}
        homeFurniture={homeFurniture}
        backpackId={backpackId}
        snackCounts={snackCounts}
        backpackSpaceUsed={backpackSpaceUsed}
        backpackCapacity={backpackCapacity}
        onEatSnack={onEatSnack}
        onSleep={onSleep}
        onEatMeal={onEatMeal}
        onChill={onChill}
        onWatchTv={onWatchTv}
        onOpenFurnitureSell={onOpenFurnitureSell}
        groceryFreshness={groceryFreshness}
        hasFridge={hasFridge}
        watchHappinessPerHour={watchHappinessPerHour}
        npcInteractions={npcInteractions}
        datingPartnerId={datingPartnerId}
        onTalkToNpc={onTalkToNpc}
        onStartDating={onStartDating}
      />
      </PhaseScrollRoot>
    );
  }

  // Gym
  if (!showMapOverlay && gamePhase === 'gym') {
    return (
      <PhaseScrollRoot>
      <GymView
        onOpenMapOverlay={onOpenMapOverlay}
        currentMoney={stats.money}
        currentEnergy={stats.energy}
        gymMembership={gymMembership}
        gymLocationTier={GYM_TIER_BY_DISTRICT[gymDistrict]}
        gymDistrictName={gymDistrict}
        onSelectMembership={onSelectGymMembership}
        onWorkout={onGymWorkout}
        onGymChill={onGymChill}
        onBuyGymSnack={onBuyGymSnack}
        backpackId={backpackId}
        snackCounts={snackCounts}
        togoCarried={togoCarried}
        backpackSpaceUsed={backpackSpaceUsed}
        backpackCapacity={backpackCapacity}
        npcInteractions={npcInteractions}
        datingPartnerId={datingPartnerId}
        onTalkToNpc={onTalkToNpc}
        onStartDating={onStartDating}
      />
      </PhaseScrollRoot>
    );
  }

  // Grocery Store
  if (!showMapOverlay && gamePhase === 'grocery') {
    return (
      <PhaseScrollRoot>
      <GroceryStoreView
        onOpenMapOverlay={onOpenMapOverlay}
        currentMoney={stats.money}
        onBuyGroceries={onBuyGroceries}
        onBuyFastFood={onBuyFastFood}
        backpackId={backpackId}
        snackCounts={snackCounts}
        backpackSpaceUsed={backpackSpaceUsed}
        backpackCapacity={backpackCapacity}
        onBuyBackpack={onBuyBackpack}
        onBuySnack={onBuySnack}
        skincareDoses={skincareDoses}
        onBuySkincare={onBuySkincare}
        onGetHaircut={onGetHaircut}
        haircutSalon={haircutSalon}
      />
      </PhaseScrollRoot>
    );
  }

  // Furniture Store
  if (!showMapOverlay && gamePhase === 'furniture') {
    return (
      <PhaseScrollRoot>
      <FurnitureStoreView
        onOpenMapOverlay={onOpenMapOverlay}
        currentMoney={stats.money}
        homeFurniture={homeFurniture}
        onBuyFurniture={onBuyFurniture}
        onOpenFurnitureSell={onOpenFurnitureSell}
      />
      </PhaseScrollRoot>
    );
  }

  // Park
  if (!showMapOverlay && gamePhase === 'park') {
    return (
      <PhaseScrollRoot>
      <ParkView
        onOpenMapOverlay={onOpenMapOverlay}
        currentEnergy={stats.energy}
        currentWeather={currentWeather}
        onWalk={onParkWalk}
        parkDistrict={parkDistrict}
        npcInteractions={npcInteractions}
        datingPartnerId={datingPartnerId}
        onTalkToNpc={onTalkToNpc}
        onStartDating={onStartDating}
      />
      </PhaseScrollRoot>
    );
  }

  // Workplace (work shifts) - skip when map overlay open
  if (!showMapOverlay && gamePhase === 'work') {
    return (
      <PhaseScrollRoot>
      <JobCenter
        mode="work"
        jobs={jobs}
        selectedJob={selectedJob}
        onSelectJob={onSelectJob}
        onWorkShift={onWorkShift}
        onWorkOvertime={onWorkOvertime}
        workHoursPerShift={workHoursPerShift}
        maxWorkHours={maxWorkHours}
        canWorkNow={canWorkNow}
        canWorkOvertimeNow={canWorkOvertimeNow}
        isFirstDayOfWork={isFirstDayOfWork}
        isWeekday={((stats.dayOfYear - 1) % 7) < 5}
        jobSchedule={jobSchedule}
        setJobSchedule={setJobSchedule}
        stats={stats}
        getSalaryPerDay={getSalaryPerDay}
        getSalaryPerHour={getSalaryPerHour}
        getEffectiveSalary={getEffectiveSalary}
        getCurrentJobTitle={getCurrentJobTitle}
        promotionCheck={promotionCheck}
        onAskForPromotion={onAskForPromotion}
        onOpenMapOverlay={onOpenMapOverlay}
        educationLevel={educationLevel}
        educationDegree={educationDegree}
        onCafeteriaMeal={onCafeteriaMeal}
        jobOfficeOpen
      />
      </PhaseScrollRoot>
    );
  }

  // Job Office (job selection / hiring) - skip when map overlay open
  if (!showMapOverlay && gamePhase === 'selecting-job') {
    return (
      <PhaseScrollRoot>
      <JobCenter
        mode="selection"
        jobs={jobs}
        selectedJob={selectedJob}
        onSelectJob={onSelectJob}
        onWorkShift={onWorkShift}
        onWorkOvertime={onWorkOvertime}
        workHoursPerShift={workHoursPerShift}
        maxWorkHours={maxWorkHours}
        canWorkNow={canWorkNow}
        canWorkOvertimeNow={canWorkOvertimeNow}
        isFirstDayOfWork={isFirstDayOfWork}
        isWeekday={((stats.dayOfYear - 1) % 7) < 5}
        jobSchedule={jobSchedule}
        setJobSchedule={setJobSchedule}
        stats={stats}
        getSalaryPerDay={getSalaryPerDay}
        getSalaryPerHour={getSalaryPerHour}
        getEffectiveSalary={getEffectiveSalary}
        getCurrentJobTitle={getCurrentJobTitle}
        promotionCheck={promotionCheck}
        onAskForPromotion={onAskForPromotion}
        onOpenMapOverlay={onOpenMapOverlay}
        educationLevel={educationLevel}
        educationDegree={educationDegree}
        jobOfficeOpen={jobOfficeOpen}
        onQuitJob={onQuitJob}
      />
      </PhaseScrollRoot>
    );
  }

  // School Phase (skip when map overlay open)
  if (!showMapOverlay && gamePhase === 'school') {
    return (
      <PhaseScrollRoot>
      <SchoolView
        onOpenMapOverlay={onOpenMapOverlay}
        educationLevel={educationLevel}
        educationDegree={educationDegree}
        educationProgress={educationProgress}
        currentMoney={currentMoney}
        currentRent={currentRent}
        dayOfYear={dayOfYear}
        schoolCampusOpen={schoolCampusOpen}
        schoolCampusClosedReason={schoolCampusClosedReason}
        tuitionPaidCurrentSeason={tuitionPaidCurrentSeason}
        onStartDegree={onStartDegree}
        onStudy={onStudy}
        onChillAtSchool={onChillAtSchool}
        onPublicNapAtSchool={onPublicNapAtSchool}
        onEatSchoolCafe={onEatSchoolCafe}
        npcInteractions={npcInteractions}
        datingPartnerId={datingPartnerId}
        onTalkToNpc={onTalkToNpc}
        onStartDating={onStartDating}
        schoolTutorialOpen={schoolTutorialOpen}
        onDismissSchoolTutorial={onDismissSchoolTutorial}
        schoolMeetClassmatesOpen={schoolMeetClassmatesOpen}
        onDismissSchoolMeetClassmates={onDismissSchoolMeetClassmates}
      />
      </PhaseScrollRoot>
    );
  }

  // Free Play or Map Overlay - map with activities, travel times from current location
  return (
    <Card
      className={`${gameChromePanel} h-full flex flex-col min-h-0 ${mapOverlayOpen ? 'ring-2 ring-sky-500 ring-offset-2 ring-offset-[#d8e0eb]' : ''}`}
    >
      <CardHeader
        className={`flex-shrink-0 py-2 px-3 flex flex-row items-center justify-between gap-2 ${gameChromePhaseCardHeader}`}
      >
        <div>
          <CardTitle className="text-base text-slate-900">{mapOverlayOpen ? 'Map · Where you are' : 'Map'}</CardTitle>
          <CardDescription className="text-xs text-slate-700">
            {mapOverlayOpen
              ? 'Travel times from your current location.'
              : 'Click a location to go to school, find a job, and explore.'}
          </CardDescription>
        </div>
        <div className="flex gap-1">
          {mapOverlayOpen && gamePhase !== 'free-play' && (
            <Button variant="outline" size="sm" onClick={() => handleLocationClick('free-play', onGoToCityView)} className="text-xs">
              City Center
            </Button>
          )}
          {mapOverlayOpen && onCloseMapOverlay && (
            <Button variant="default" size="sm" onClick={onCloseMapOverlay} className="text-xs">
              Close
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 flex flex-col pt-0 px-2 pb-2">
        <div className={`relative w-full flex-1 min-h-0 ${gameChromeMapCanvas} overflow-hidden`}>
          <WerdredMapTrackLayer />
          {/* District labels – no grid, hover shows options */}
          {DISTRICT_NAMES.map((district) => {
            const pos = DISTRICT_POSITIONS[district];
            const options = getDistrictOptions(district, selectedApartment, selectedJob, {
              onGoToSchool,
              schoolCampusOpen,
              schoolCampusClosedReason,
              onGoToHomeSelection,
              onGoToHome,
              onGoToGym,
              onGoToPark,
              onGoToGrocery,
              onGoToFurniture,
              onGoToJobSelection,
              onGoToWork,
              jobOfficeOpen,
            });
            const optionList = options.map((o) => o.label).join(', ');
            return (
              <Tooltip key={district}>
                <TooltipTrigger asChild>
                  <div
                    className="absolute cursor-pointer rounded-md bg-[#eef2f8]/95 shadow-md border border-[#1a2332] hover:bg-white hover:shadow-lg hover:border-sky-600 transition-all px-3 py-2 min-w-[4rem] flex items-center justify-center"
                    style={{
                      left: `${pos.x}%`,
                      top: `${pos.y}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        asChild
                        disabled={!!(animatingTo || animatingPath)}
                        className="border-0 bg-transparent p-0 cursor-pointer text-left font-semibold text-gray-800 text-sm disabled:opacity-70 disabled:pointer-events-none focus:outline-none focus:ring-0"
                      >
                        <span className="text-slate-900">{district}</span>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="center" className="min-w-[180px]">
                        {options.map((opt) => (
                          <DropdownMenuItem
                            key={opt.label}
                            disabled={opt.disabled}
                            title={opt.disabled && opt.disabledReason ? opt.disabledReason : undefined}
                            onClick={() => {
                              if (opt.disabled) return;
                              handleLocationClick(opt.phase, opt.navigate, opt.destDistrict);
                            }}
                          >
                            {opt.label}
                            {getTravelMinutes(opt.phase, opt.destDistrict) > 0 && (
                              <span className="ml-auto text-xs text-muted-foreground">
                                {getTravelMinutes(opt.phase, opt.destDistrict)} min
                              </span>
                            )}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p className="font-medium">{district}</p>
                  <p className="text-xs text-muted-foreground mt-1">{optionList}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Click to choose destination</p>
                </TooltipContent>
              </Tooltip>
            );
          })}

          {/* Player icon – follows train track path when traveling */}
          <motion.div
            className="absolute pointer-events-none z-10"
            style={{ transform: 'translate(-50%, -50%)' }}
            initial={false}
            animate={
              animatingPath && animatingPath.length > 1
                ? {
                    left: animatingPath.map((p) => `${p.x}%`),
                    top: animatingPath.map((p) => `${p.y}%`),
                  }
                : {
                    left: `${getMapPosition(
                      animatingTo ?? gamePhase,
                      selectedApartment?.district,
                      animatingTo === 'park' && animatingDestDistrict ? animatingDestDistrict : parkDistrict,
                      animatingTo === 'grocery' && animatingDestDistrict ? animatingDestDistrict : groceryDistrict,
                      animatingTo === 'furniture' && animatingDestDistrict ? animatingDestDistrict : furnitureDistrict,
                      (animatingTo ?? gamePhase) === 'work' ? selectedJob?.district : undefined,
                      (animatingTo ?? gamePhase) === 'gym'
                        ? animatingTo === 'gym' && animatingDestDistrict
                          ? (animatingDestDistrict as 'Dewmist' | 'Semba' | 'Marina')
                          : gymDistrict
                        : undefined
                    ).x}%`,
                    top: `${getMapPosition(
                      animatingTo ?? gamePhase,
                      selectedApartment?.district,
                      animatingTo === 'park' && animatingDestDistrict ? animatingDestDistrict : parkDistrict,
                      animatingTo === 'grocery' && animatingDestDistrict ? animatingDestDistrict : groceryDistrict,
                      animatingTo === 'furniture' && animatingDestDistrict ? animatingDestDistrict : furnitureDistrict,
                      (animatingTo ?? gamePhase) === 'work' ? selectedJob?.district : undefined,
                      (animatingTo ?? gamePhase) === 'gym'
                        ? animatingTo === 'gym' && animatingDestDistrict
                          ? (animatingDestDistrict as 'Dewmist' | 'Semba' | 'Marina')
                          : gymDistrict
                        : undefined
                    ).y}%`,
                  }
            }
            transition={{
              type: 'tween',
              ease: 'easeInOut',
              duration: animatingPath && animatingPath.length > 1 ? getTravelAnimDuration(animatingTo!, animatingDestDistrict ?? undefined) : 0,
              times: animatingPath && animatingPath.length > 1 ? animatingPath.map((_, i) => i / (animatingPath.length - 1)) : undefined,
            }}
          >
            <div className="bg-blue-600 p-2.5 rounded-full shadow-xl border-2 border-white ring-2 ring-blue-400">
              <CircleUser className="size-6 text-white" />
            </div>
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-bold text-blue-700 bg-white/90 px-2 py-0.5 rounded shadow">
              You
            </div>
          </motion.div>
        </div>
      </CardContent>
    </Card>
  );
}
