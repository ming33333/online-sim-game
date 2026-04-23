import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { Dumbbell } from 'lucide-react';
import { GYM_COSTS_PER_WEEK, GYM_HAPPINESS, GYM_TIER_BY_DISTRICT, WORKOUT_EFFECTS } from '../../game/constants';
import {
  GYM_SNACK_OFFERS,
  SNACK_BY_ID,
  getUsedBackpackSpace,
  type BackpackId,
  type SnackId,
} from '../lib/inventory';
import { formatMoney } from '../lib/formatNumber';
import { gameChromePanel, gameChromePhaseCardHeader } from '../lib/gameChrome';
import { relationshipStageLabel, type NpcId } from '../lib/relationships';

export type GymTier = 'cheap' | 'normal' | 'luxury';

interface Gym {
  id: GymTier;
  name: string;
  costPerWeek: number;
  happinessOnWorkout: number;
}

const GYMS: Gym[] = [
  {
    id: 'cheap',
    name: 'Budget Gym',
    costPerWeek: GYM_COSTS_PER_WEEK.cheap,
    happinessOnWorkout: GYM_HAPPINESS.cheap,
  },
  {
    id: 'normal',
    name: 'FitZone',
    costPerWeek: GYM_COSTS_PER_WEEK.normal,
    happinessOnWorkout: GYM_HAPPINESS.normal,
  },
  {
    id: 'luxury',
    name: 'Elite Wellness',
    costPerWeek: GYM_COSTS_PER_WEEK.luxury,
    happinessOnWorkout: GYM_HAPPINESS.luxury,
  },
];

type WorkoutIntensity = 'easy' | 'normal' | 'intense';

function districtNameForTier(tier: GymTier): string {
  const e = (Object.entries(GYM_TIER_BY_DISTRICT) as [string, GymTier][]).find(([, t]) => t === tier);
  return e?.[0] ?? 'the map';
}

interface GymViewProps {
  currentMoney: number;
  currentEnergy: number;
  gymMembership: GymTier | null;
  /** Tier offered at this physical location (Dewmist cheap / Semba standard / Marina premium). */
  gymLocationTier: GymTier;
  gymDistrictName: 'Dewmist' | 'Semba' | 'Marina';
  onSelectMembership: (tier: GymTier) => void;
  onWorkout: (tier: GymTier, intensity: WorkoutIntensity) => void;
  onGymChill: (hours: number) => void;
  onBuyGymSnack: (snackId: SnackId, price: number) => void;
  backpackId: BackpackId | null;
  snackCounts: Record<SnackId, number>;
  togoCarried: { regular: number; lux: number };
  backpackSpaceUsed: number;
  backpackCapacity: number;
  onOpenMapOverlay: () => void;
  npcInteractions: Record<NpcId, number>;
  datingPartnerId: NpcId | null;
  onTalkToNpc: (id: NpcId) => void;
  onStartDating: (id: NpcId) => void;
}

export function GymView({
  currentMoney,
  currentEnergy,
  gymMembership,
  gymLocationTier,
  gymDistrictName,
  onSelectMembership,
  onWorkout,
  onGymChill,
  onBuyGymSnack,
  backpackId,
  snackCounts,
  togoCarried,
  backpackSpaceUsed,
  backpackCapacity,
  onOpenMapOverlay,
  npcInteractions,
  datingPartnerId,
  onTalkToNpc,
  onStartDating,
}: GymViewProps) {
  const [selectedIntensity, setSelectedIntensity] = useState<WorkoutIntensity>('normal');
  const [chillHours, setChillHours] = useState(1);

  const luciaId = 'gym-lucia' as const satisfies NpcId;
  const luciaCount = npcInteractions[luciaId] ?? 0;

  const localGym = GYMS.find((g) => g.id === gymLocationTier) ?? GYMS[0];
  const wrongLocation = gymMembership != null && gymMembership !== gymLocationTier;
  const canUseThisGym = gymMembership != null && gymMembership === gymLocationTier;

  const usedSnacksOnly = getUsedBackpackSpace(snackCounts, togoCarried);

  return (
    <Card className={`${gameChromePanel} w-full min-h-full flex flex-col`}>
      <CardHeader
        className={`flex items-center justify-between gap-2 flex-shrink-0 py-2 px-3 ${gameChromePhaseCardHeader}`}
      >
        <div className="min-w-0">
          <CardTitle className="text-base flex items-center gap-2 text-slate-900">
            <Dumbbell className="size-4 text-sky-700" />
            Gym
          </CardTitle>
          <CardDescription className="text-xs text-slate-700">
            {localGym.name} · {gymDistrictName}. Other tiers are at gyms in Dewmist, Semba, or Marina — pick one on the map.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={onOpenMapOverlay} className="text-xs shrink-0">
          Map
        </Button>
      </CardHeader>
      <CardContent className="space-y-4 px-3 sm:px-4 pb-4 pt-2">
        {wrongLocation && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-950">
            <p className="font-semibold">Not your membership tier here</p>
            <p className="mt-1 text-[11px] leading-snug">
              You have {GYMS.find((g) => g.id === gymMembership)?.name ?? 'a membership'} (
              {districtNameForTier(gymMembership)}). Open the map and go to that district to work out, or join{' '}
              {localGym.name} here.
            </p>
          </div>
        )}

        {(!gymMembership || wrongLocation) && (
          <div className="space-y-2">
            <p className="text-xs font-medium">{wrongLocation ? 'Switch to this gym (per week)' : 'Join this gym (per week)'}</p>
            <div
              className="border-2 border-gray-200 p-3 rounded-lg hover:border-purple-400 cursor-pointer transition-all bg-white"
              onClick={() => currentMoney >= localGym.costPerWeek && onSelectMembership(localGym.id)}
            >
              <div className="flex justify-between items-center">
                <span className="font-semibold text-sm">{localGym.name}</span>
                <span className="text-sm">{`$${formatMoney(localGym.costPerWeek)}/week`}</span>
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                Workout: {localGym.happinessOnWorkout > 0 ? '+' : ''}
                {localGym.happinessOnWorkout} happiness
              </p>
              {currentMoney < localGym.costPerWeek && <p className="text-xs text-red-600 mt-1">Can&apos;t afford</p>}
            </div>
          </div>
        )}

        {canUseThisGym ? (
          <>
            <p className="text-xs font-medium text-gray-700 mb-2">Current: {localGym.name}</p>

            <div className="rounded-lg border border-pink-200 bg-pink-50/80 p-3 space-y-2 mt-2">
              <p className="text-xs font-semibold text-gray-900">Someone at the lounge</p>
              <p className="text-[11px] text-gray-600">Lucia Chen · gym regular</p>
              <p className="text-[11px] text-pink-950">
                {relationshipStageLabel(luciaCount, datingPartnerId === luciaId)} · {luciaCount} chat
                {luciaCount === 1 ? '' : 's'}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="secondary" onClick={() => onTalkToNpc(luciaId)}>
                  Talk
                </Button>
                {luciaCount >= 50 && datingPartnerId !== luciaId && (
                  <Button
                    type="button"
                    size="sm"
                    className="bg-rose-600 hover:bg-rose-700"
                    disabled={datingPartnerId != null}
                    onClick={() => onStartDating(luciaId)}
                  >
                    Ask out
                  </Button>
                )}
              </div>
              {datingPartnerId != null && datingPartnerId !== luciaId && luciaCount >= 50 && (
                <p className="text-[10px] text-amber-800">Ask out is unavailable while you&apos;re dating someone else.</p>
              )}
            </div>

            <div className="rounded-lg border border-stone-200 bg-stone-50/80 p-3 space-y-2">
              <p className="text-xs font-medium">Lounge — chill out</p>
              <p className="text-[10px] text-gray-600">Like relaxing at home, minus decor bonuses.</p>
              <div className="flex flex-wrap gap-2 items-center">
                <select
                  className="text-xs border rounded px-2 py-1 bg-white"
                  value={chillHours}
                  onChange={(e) => setChillHours(Number(e.target.value))}
                >
                  {[1, 2, 3, 4].map((h) => (
                    <option key={h} value={h}>
                      {h}h
                    </option>
                  ))}
                </select>
                <Button size="sm" variant="secondary" onClick={() => onGymChill(chillHours)}>
                  Chill {chillHours}h
                </Button>
              </div>
            </div>

            <div className="rounded-lg border border-emerald-200/80 bg-emerald-50/50 p-3 space-y-2">
              <p className="text-xs font-medium">Vending snacks</p>
              <p className="text-[10px] text-gray-600">
                Goes in your backpack ({backpackId ? `${backpackSpaceUsed}/${backpackCapacity} space` : 'buy a backpack first'}
                ).
              </p>
              <div className="space-y-2">
                {GYM_SNACK_OFFERS.map(({ snackId, price }) => {
                  const s = SNACK_BY_ID[snackId];
                  const cap = backpackCapacity;
                  const fits = cap > 0 && usedSnacksOnly + s.spaceUnits <= cap;
                  const canBuy = currentMoney >= price && fits && backpackId != null;
                  return (
                    <div key={snackId} className="flex items-center justify-between gap-2 text-xs">
                      <span>
                        {s.label} +{s.hunger} · {s.spaceUnits} space
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!canBuy}
                        className="shrink-0 h-7 text-[11px]"
                        title={
                          !backpackId
                            ? 'Buy a backpack at the grocery store'
                            : !fits
                              ? 'Backpack full'
                              : currentMoney < price
                                ? `Need $${formatMoney(price)}`
                                : undefined
                        }
                        onClick={() => onBuyGymSnack(snackId, price)}
                      >
                        {`$${formatMoney(price)}`}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium">Workout intensity (1 hr)</p>
              <div className="flex gap-1">
                {(['easy', 'normal', 'intense'] as const).map((int) => (
                  <button
                    key={int}
                    type="button"
                    onClick={() => setSelectedIntensity(int)}
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      selectedIntensity === int
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    {int}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-gray-500">
                Energy: −{WORKOUT_EFFECTS[selectedIntensity].energyCost} · Health: +
                {WORKOUT_EFFECTS[selectedIntensity].healthGain}
              </p>
            </div>
            {(() => {
              const cost = WORKOUT_EFFECTS[selectedIntensity].energyCost;
              const tooTired = currentEnergy < cost;
              const hg = WORKOUT_EFFECTS[selectedIntensity].healthGain;
              return (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-block w-full">
                      <Button
                        onClick={() => onWorkout(gymMembership, selectedIntensity)}
                        disabled={tooTired}
                        className="w-full"
                      >
                        Work out 1 hour
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs text-left">
                    {tooTired
                      ? `Not enough energy — ${selectedIntensity} costs ${cost} energy (you have ${Math.floor(currentEnergy)}).`
                      : `1 hour: −${cost} energy, +${hg} health (plus gym happiness).`}
                  </TooltipContent>
                </Tooltip>
              );
            })()}
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
