import { motion } from 'motion/react';
import { Home, MapPin, Briefcase, Dumbbell, Trees, ShoppingCart, CircleUser } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import React, { useState, useEffect } from 'react';
import type { GameStats, Apartment, Job, Degree, JobSchedule, DistrictName } from './LifeSimGame';
type EducationLevel = 'none' | 'in-progress' | 'completed';
import { JobCenter } from './JobCenter';
import { SchoolView } from './SchoolView';
import { HomeView } from './HomeView';
import { GymView } from './GymView';
import type { GymTier } from './GymView';
import { ParkView } from './ParkView';
import { GroceryStoreView } from './GroceryStoreView';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

type MapPhase = 'selecting-home' | 'selecting-job' | 'free-play' | 'school' | 'home' | 'gym' | 'park' | 'grocery';

export interface InteractiveMapProps {
  stats: GameStats;
  onActivityComplete: (
    effect: { health?: number; happiness?: number; money?: number; smarts?: number },
    resultText: string,
    daysPassed: number
  ) => void;
  gamePhase: 'selecting-home' | 'selecting-job' | 'free-play' | 'school' | 'home' | 'gym' | 'park' | 'grocery';
  apartments: Apartment[];
  jobs: Job[];
  selectedJob: Job | null;
  onSelectApartment: (apartment: Apartment) => void;
  onSelectJob: (job: Job, schedule?: JobSchedule) => void;
  onWorkShift: (intensity?: 'slack' | 'normal' | 'hard') => void;
  onWorkOvertime: (intensity?: 'slack' | 'normal' | 'hard') => void;
  workHoursPerShift: number;
  canWorkNow: boolean;
  canWorkOvertimeNow: boolean;
  isFirstDayOfWork: boolean;
  onPassOneHour: () => void;
  jobSchedule: JobSchedule;
  setJobSchedule: (s: JobSchedule) => void;
  getSalaryPerDay: (job: Job) => number;
  getSalaryPerHour: (job: Job) => number;
  getEffectiveSalary: (job: Job) => number;
  getCurrentJobTitle: (job: Job) => string;
  promotionCheck: { allowed: boolean; reason?: string; chance?: number };
  onAskForPromotion: () => void;
  onGoToSchool: () => void;
  onGoToJobSelection: () => void;
  onGoToHomeSelection: () => void;
  onGoToHome: () => void;
  onGoToGym: () => void;
  onGoToPark: (district: DistrictName) => void;
  onGoToGrocery: (district: DistrictName) => void;
  onGoToCityView: () => void;
  onOpenMapOverlay: () => void;
  onBuyGroceries: (option: string, meals: number, hungerPerMeal: number, cost: number) => void;
  educationLevel: EducationLevel;
  educationDegree: Degree | null;
  educationProgress: number;
  currentMoney: number;
  currentRent: number;
  rentOverdue: boolean;
  universityHousingStudentRent: number;
  dayOfYear: number;
  onStartDegree: (degree: Degree) => void;
  onStudy: (intensity: 'slack' | 'normal' | 'focus', hours: number) => void;
  selectedApartment: Apartment | null;
  parkDistrict: DistrictName | null;
  groceryDistrict: DistrictName | null;
  gymMembership: GymTier | null;
  onSelectGymMembership: (tier: GymTier) => void;
  onGymWorkout: (tier: GymTier, intensity: 'easy' | 'normal' | 'intense') => void;
  onParkWalk: () => void;
  onSleep: (hours: number) => void;
  onEatMeal: (type: 'regular' | 'lux') => void;
  groceries: { regular: number; lux: number };
  currentWeather: { type: string; tempF: number; quality: string } | null;
  getTravelMinutes: (targetPhase: MapPhase, destDistrict?: DistrictName) => number;
  mapOverlayOpen?: boolean;
  onCloseMapOverlay?: () => void;
  pendingGoHomeAnimation?: boolean;
  onGoHomeAnimationDone?: () => void;
  pendingGoToSchoolAnimation?: boolean;
  onGoToSchoolAnimationDone?: () => void;
}

// District positions on map (no visible grid). Same layout: Dewmist top-left, Semba next, etc.
const DISTRICT_POSITIONS: Record<DistrictName, { x: number; y: number }> = {
  Dewmist: { x: 12.5, y: 12.5 },
  Semba: { x: 37.5, y: 12.5 },
  Centerlight: { x: 37.5, y: 62.5 },
  Ellum: { x: 62.5, y: 62.5 },
  Marina: { x: 37.5, y: 87.5 },
};

const DISTRICT_NAMES: DistrictName[] = ['Dewmist', 'Semba', 'Centerlight', 'Ellum', 'Marina'];

// Track graph: horizontal/vertical segments only (no diagonal). Used so travel animation follows rails.
const TRACK_GRAPH: Record<DistrictName, DistrictName[]> = {
  Dewmist: ['Semba'],
  Semba: ['Dewmist', 'Centerlight'],
  Centerlight: ['Semba', 'Ellum', 'Marina'],
  Ellum: ['Centerlight'],
  Marina: ['Centerlight'],
};

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

type DistrictOption = { label: string; phase: MapPhase; navigate: () => void; disabled?: boolean; destDistrict?: DistrictName };
const getDistrictOptions = (
  district: DistrictName,
  selectedApartment: Apartment | null,
  handlers: {
    onGoToSchool: () => void;
    onGoToHomeSelection: () => void;
    onGoToHome: () => void;
    onGoToGym: () => void;
    onGoToPark: (d: DistrictName) => void;
    onGoToGrocery: (d: DistrictName) => void;
    onGoToJobSelection: () => void;
  }
): DistrictOption[] => {
  const homeOption: DistrictOption[] =
    selectedApartment && district === selectedApartment.district
      ? [{ label: 'Home', phase: 'home', navigate: handlers.onGoToHome }]
      : [];
  const base: DistrictOption[] = [
    ...homeOption,
    { label: 'Park', phase: 'park', navigate: () => handlers.onGoToPark(district), destDistrict: district },
    { label: 'Grocery Store', phase: 'grocery', navigate: () => handlers.onGoToGrocery(district), destDistrict: district },
  ];
  if (district === 'Dewmist') return [{ label: 'School', phase: 'school', navigate: handlers.onGoToSchool }, ...base];
  if (district === 'Semba') return [{ label: 'Gym', phase: 'gym', navigate: handlers.onGoToGym }, ...base];
  if (district === 'Centerlight')
    return [
      { label: 'Job Center', phase: 'selecting-job', navigate: handlers.onGoToJobSelection },
      { label: 'Housing Office', phase: 'selecting-home', navigate: handlers.onGoToHomeSelection },
      ...base,
    ];
  return base;
};

const PHASE_TO_POSITION: Record<Exclude<MapPhase, 'home' | 'park' | 'grocery'>, { x: number; y: number }> = {
  'free-play': DISTRICT_POSITIONS.Centerlight,
  school: DISTRICT_POSITIONS.Dewmist,
  'selecting-home': DISTRICT_POSITIONS.Centerlight,
  gym: DISTRICT_POSITIONS.Semba,
  'selecting-job': DISTRICT_POSITIONS.Centerlight,
};

function getMapPosition(
  phase: MapPhase,
  homeDistrict?: DistrictName,
  parkDistrict?: DistrictName | null,
  groceryDistrict?: DistrictName | null
): { x: number; y: number } {
  if (phase === 'home' && homeDistrict) return DISTRICT_POSITIONS[homeDistrict];
  if (phase === 'home') return DISTRICT_POSITIONS.Centerlight;
  if (phase === 'park') return DISTRICT_POSITIONS[parkDistrict ?? 'Ellum'];
  if (phase === 'grocery') return DISTRICT_POSITIONS[groceryDistrict ?? 'Centerlight'];
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
  canWorkNow,
  canWorkOvertimeNow,
  isFirstDayOfWork,
  onPassOneHour,
  jobSchedule,
  setJobSchedule,
  getSalaryPerDay,
  getSalaryPerHour,
  getEffectiveSalary,
  getCurrentJobTitle,
  promotionCheck,
  onAskForPromotion,
  onGoToSchool,
  onGoToJobSelection,
  onGoToHomeSelection,
  onGoToHome,
  onGoToGym,
  onGoToPark,
  onGoToGrocery,
  onGoToCityView,
  onOpenMapOverlay,
  onBuyGroceries,
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
  onParkWalk,
  onSleep,
  onEatMeal,
  groceries,
  currentWeather,
  getTravelMinutes,
  parkDistrict,
  groceryDistrict,
  mapOverlayOpen = false,
  onCloseMapOverlay,
  pendingGoHomeAnimation = false,
  onGoHomeAnimationDone,
  pendingGoToSchoolAnimation = false,
  onGoToSchoolAnimationDone,
}: InteractiveMapProps) {
  const [selectedItem, setSelectedItem] = useState<Apartment | Job | null>(null);
  const [animatingTo, setAnimatingTo] = useState<MapPhase | null>(null);
  const [animatingDestDistrict, setAnimatingDestDistrict] = useState<DistrictName | null>(null);
  const [animatingPath, setAnimatingPath] = useState<{ x: number; y: number }[] | null>(null);

  const getTravelAnimDuration = (target: MapPhase, destDistrict?: DistrictName) =>
    Math.min(0.7, Math.max(0.3, getTravelMinutes(target, destDistrict) / 80)); // 20 min = 0.25s, 40 min = 0.5s

  const handleLocationClick = (target: MapPhase, navigate: () => void, destDistrict?: DistrictName) => {
    if (animatingTo || animatingPath) return;
    if (gamePhase === target) {
      if (target === 'park' && destDistrict === parkDistrict) return;
      if (target === 'grocery' && destDistrict === groceryDistrict) return;
      if (target !== 'park' && target !== 'grocery') return;
    }
    const fromPos = getMapPosition(gamePhase, selectedApartment?.district, parkDistrict, groceryDistrict);
    const toPos = getMapPosition(
      target,
      selectedApartment?.district,
      target === 'park' ? (destDistrict ?? parkDistrict) : parkDistrict,
      target === 'grocery' ? (destDistrict ?? groceryDistrict) : groceryDistrict
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
    const fromPos = getMapPosition(gamePhase, selectedApartment?.district, parkDistrict, groceryDistrict);
    const toPos = getMapPosition('home', selectedApartment?.district, parkDistrict, groceryDistrict);
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
    const fromPos = getMapPosition(gamePhase, selectedApartment?.district, parkDistrict, groceryDistrict);
    const toPos = getMapPosition('school', selectedApartment?.district, parkDistrict, groceryDistrict);
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
    return (
      <Card className="h-full flex flex-col min-h-0">
      <CardHeader className="flex-shrink-0 py-2">
        <CardTitle className="text-base">Choose Your Home in Werdred</CardTitle>
        <CardDescription className="text-xs">Click an apartment on the map to see details, then &quot;Move In Here&quot;. You must choose a home before exploring the city.</CardDescription>
      </CardHeader>
        <CardContent className="flex-1 min-h-0 flex flex-col pt-0">
          {/* Map View with Apartments */}
          <div className="relative w-full flex-1 min-h-[200px] bg-gradient-to-br from-green-200 via-blue-200 to-purple-200 rounded-lg border-4 border-gray-300 overflow-hidden mb-2">
            <div className="absolute inset-0">
              {/* City background elements */}
              <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-gray-600 to-transparent opacity-30"></div>
              
              {/* Apartment markers on map */}
              {apartments.map((apartment) => (
                <div
                  key={apartment.id}
                  className="absolute cursor-pointer transition-all duration-200 hover:brightness-110 hover:ring-4 hover:ring-white/80 rounded-full"
                  style={{
                    left: `${apartment.position.x}%`,
                    top: `${apartment.position.y}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  onClick={() => setSelectedItem(apartment)}
                  onKeyDown={(e) => e.key === 'Enter' && setSelectedItem(apartment)}
                  role="button"
                  tabIndex={0}
                >
                  <div className={`bg-gradient-to-br ${apartment.color} p-4 rounded-full shadow-xl border-4 border-white`}>
                    <Home className="size-8 text-white" />
                  </div>
                  <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 whitespace-nowrap bg-black/75 text-white px-3 py-1 rounded text-sm font-semibold">
                    {apartment.name}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Selected Apartment Details */}
          {selectedItem && 'rent' in selectedItem && (() => {
            const isUniversityHousing = selectedItem.id === 'university-housing';
            const isEnrolled = educationLevel === 'in-progress';
            const effectiveRent = isUniversityHousing && isEnrolled ? universityHousingStudentRent : selectedItem.rent;
            return (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="border-2 border-purple-400 p-6 rounded-lg bg-white shadow-lg"
            >
              <h3 className="text-2xl font-bold mb-2">{selectedItem.name}</h3>
              <p className="text-gray-600 mb-4">{selectedItem.description}</p>
              <div className="bg-purple-50 p-4 rounded-lg mb-4">
                <div className="text-xl font-bold text-purple-700 mb-3">
                  ${effectiveRent}/season
                  {isUniversityHousing && isEnrolled && (
                    <span className="ml-2 text-sm font-normal text-green-700">(student rate)</span>
                  )}
                </div>
                <div className="space-y-2">
                  {selectedItem.bonus.health != null && selectedItem.bonus.health !== 0 && (
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded text-sm ${
                        selectedItem.bonus.health > 0
                          ? 'bg-red-100 text-red-700'
                          : 'bg-red-200 text-red-800'
                      }`}>
                        ❤️ Health {selectedItem.bonus.health > 0 ? '+' : ''}{Number(selectedItem.bonus.health).toFixed(2)}
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
                        😊 Happiness {selectedItem.bonus.happiness > 0 ? '+' : ''}{Number(selectedItem.bonus.happiness).toFixed(2)}
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
              <Button
                onClick={() => onSelectApartment(selectedItem)}
                disabled={effectiveRent > 0 && stats.money < effectiveRent}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 transition-all hover:brightness-110 hover:ring-2 hover:ring-purple-300 disabled:opacity-50 disabled:cursor-not-allowed"
                size="lg"
              >
                {effectiveRent > 0 && stats.money < effectiveRent ? "Can't afford" : 'Move In Here'}
              </Button>
            </motion.div>
          );
          })()}

          {!selectedItem && (
            <div className="text-center p-8 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
              <MapPin className="size-16 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">Click on an apartment marker to see details</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Home - Sleep & Eat
  if (!showMapOverlay && gamePhase === 'home') {
    return (
      <HomeView
        onOpenMapOverlay={onOpenMapOverlay}
        apartmentName={selectedApartment?.name ?? 'Your Home'}
        apartmentRent={selectedApartment?.rent ?? 0}
        currentEnergy={stats.energy}
        currentHunger={stats.hunger}
        groceries={groceries}
        onSleep={onSleep}
        onEatMeal={onEatMeal}
      />
    );
  }

  // Gym
  if (!showMapOverlay && gamePhase === 'gym') {
    return (
      <GymView
        onOpenMapOverlay={onOpenMapOverlay}
        currentMoney={stats.money}
        currentEnergy={stats.energy}
        gymMembership={gymMembership}
        onSelectMembership={onSelectGymMembership}
        onWorkout={onGymWorkout}
      />
    );
  }

  // Grocery Store
  if (!showMapOverlay && gamePhase === 'grocery') {
    return (
      <GroceryStoreView
        onOpenMapOverlay={onOpenMapOverlay}
        currentMoney={stats.money}
        onBuyGroceries={onBuyGroceries}
      />
    );
  }

  // Park
  if (!showMapOverlay && gamePhase === 'park') {
    return (
      <ParkView
        onOpenMapOverlay={onOpenMapOverlay}
        currentEnergy={stats.energy}
        currentWeather={currentWeather}
        onWalk={onParkWalk}
      />
    );
  }

  // Job Selection Phase (skip when map overlay open)
  if (!showMapOverlay && gamePhase === 'selecting-job') {
    return (
      <JobCenter
        jobs={jobs}
        selectedJob={selectedJob}
        onSelectJob={onSelectJob}
        onWorkShift={onWorkShift}
        onWorkOvertime={onWorkOvertime}
        workHoursPerShift={workHoursPerShift}
        canWorkNow={canWorkNow}
        canWorkOvertimeNow={canWorkOvertimeNow}
        isFirstDayOfWork={isFirstDayOfWork}
        isWeekday={((stats.dayOfYear - 1) % 7) < 5}
        onPassOneHour={onPassOneHour}
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
      />
    );
  }

  // School Phase (skip when map overlay open)
  if (!showMapOverlay && gamePhase === 'school') {
    return (
      <SchoolView
        onOpenMapOverlay={onOpenMapOverlay}
        educationLevel={educationLevel}
        educationDegree={educationDegree}
        educationProgress={educationProgress}
        currentMoney={currentMoney}
        currentRent={currentRent}
        dayOfYear={dayOfYear}
        onStartDegree={onStartDegree}
        onStudy={onStudy}
      />
    );
  }

  // Free Play or Map Overlay - map with activities, travel times from current location
  return (
    <Card className={`h-full flex flex-col min-h-0 ${mapOverlayOpen ? 'border-2 border-blue-400' : ''}`}>
      <CardHeader className="flex-shrink-0 py-2 flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle className="text-base">{mapOverlayOpen ? 'Map · Where you are' : 'Map'}</CardTitle>
          <CardDescription className="text-xs">
            {mapOverlayOpen ? 'Travel times from your current location.' : 'Click a location to go to school, find a job, and explore.'}
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
      <CardContent className="flex-1 min-h-0 flex flex-col pt-0">
        <div className="relative w-full flex-1 min-h-[200px] bg-gradient-to-br from-green-200 via-blue-200 to-purple-200 rounded-lg border-4 border-gray-300 overflow-hidden">
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-gray-600/30 to-transparent pointer-events-none" aria-hidden />
          {/* Train tracks – single line, horizontal/vertical only (no diagonal): Dewmist–Semba–Centerlight–Ellum, Centerlight–Marina */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ opacity: 0.75 }}
            aria-hidden
            preserveAspectRatio="none"
            viewBox="0 0 100 100"
          >
            <defs>
              <linearGradient id="mapTrackGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6b7280" />
                <stop offset="100%" stopColor="#374151" />
              </linearGradient>
            </defs>
            {/* Single rail: Dewmist → Semba → Centerlight → Ellum; Centerlight → Marina */}
            <path
              d="M 12.5 12.5 L 37.5 12.5 L 37.5 62.5 L 62.5 62.5 M 37.5 62.5 L 37.5 87.5"
              fill="none"
              stroke="url(#mapTrackGradient)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Sleepers: main route only */}
            {[[12.5, 12.5], [20, 12.5], [27.5, 12.5], [35, 12.5]].map(([x, y], i) => (
              <line key={`t${i}`} x1={x} y1={y - 2} x2={x} y2={y + 2} stroke="#4b5563" strokeWidth="1" strokeLinecap="round" />
            ))}
            {[[37.5, 22], [37.5, 32], [37.5, 42], [37.5, 52], [37.5, 70], [37.5, 80]].map(([x, y], i) => (
              <line key={`v${i}`} x1={x - 2} y1={y} x2={x + 2} y2={y} stroke="#4b5563" strokeWidth="1" strokeLinecap="round" />
            ))}
            {/* Horizontal segment (Centerlight–Ellum): sleepers at Centerlight (37.5), Ellum (62.5), and between */}
            {[[37.5, 62.5], [42, 62.5], [50, 62.5], [58, 62.5], [62.5, 62.5]].map(([x, y], i) => (
              <line key={`h${i}`} x1={x - 2} y1={y} x2={x + 2} y2={y} stroke="#4b5563" strokeWidth="1" strokeLinecap="round" />
            ))}
          </svg>
          {/* District labels – no grid, hover shows options */}
          {DISTRICT_NAMES.map((district) => {
            const pos = DISTRICT_POSITIONS[district];
            const options = getDistrictOptions(district, selectedApartment, {
              onGoToSchool,
              onGoToHomeSelection,
              onGoToHome,
              onGoToGym,
              onGoToPark,
              onGoToGrocery,
              onGoToJobSelection,
            });
            const optionList = options.map((o) => o.label).join(', ');
            return (
              <Tooltip key={district}>
                <TooltipTrigger asChild>
                  <div
                    className="absolute cursor-pointer rounded-lg bg-white/95 shadow-md border border-gray-200/80 hover:bg-white hover:shadow-lg hover:border-blue-300 transition-all px-3 py-2 min-w-[4rem] flex items-center justify-center"
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
                        <span>{district}</span>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="center" className="min-w-[180px]">
                        {options.map((opt) => (
                          <DropdownMenuItem
                            key={opt.label}
                            disabled={opt.disabled}
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
                      animatingTo === 'grocery' && animatingDestDistrict ? animatingDestDistrict : groceryDistrict
                    ).x}%`,
                    top: `${getMapPosition(
                      animatingTo ?? gamePhase,
                      selectedApartment?.district,
                      animatingTo === 'park' && animatingDestDistrict ? animatingDestDistrict : parkDistrict,
                      animatingTo === 'grocery' && animatingDestDistrict ? animatingDestDistrict : groceryDistrict
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
