import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Home, UtensilsCrossed, Sparkles } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import {
  FURNITURE_BY_ID,
  type HomeFurnitureState,
  getSleepEnergyBonusPerHour,
  getChillHappinessPerHour,
  getEatHungerBonus,
} from '../lib/furniture';
import { SNACK_TYPES, TOGO_MEAL_SPACE_UNITS, type BackpackId, type SnackId } from '../lib/inventory';
import { clampFreshnessPct } from '../lib/groceries';
import { EAT_SNACK_HOURS } from '../../game/constants';
import { gameChromePanel, gameChromePhaseCardHeader } from '../lib/gameChrome';
import { relationshipStageLabel, type NpcId } from '../lib/relationships';

interface HomeViewProps {
  apartmentName: string;
  /** Stored as per 28-day season; UI shows weekly (÷4) */
  apartmentRent: number;
  isLiveWithParents: boolean;
  /** Evicted — no lease (not initial character setup) */
  isHomeless?: boolean;
  currentEnergy: number;
  currentHunger: number;
  groceries: { regular: number; lux: number };
  fridgeGroceries: { regular: number; lux: number };
  counterGroceries: { regular: number; lux: number };
  fridgeMealCapacity: number | null;
  /** Packed to-go waiting at home (not generic counter overflow). */
  togoHome: { regular: number; lux: number };
  togoFreshHome: { regular: number; lux: number };
  onPrepareTogo: (type: 'regular' | 'lux') => void;
  onStashTogo: (type: 'regular' | 'lux') => void;
  homeFurniture: HomeFurnitureState;
  backpackId: BackpackId | null;
  snackCounts: Record<SnackId, number>;
  backpackSpaceUsed: number;
  backpackCapacity: number;
  onEatSnack: (id: SnackId) => void;
  onSleep: (hours: number) => void;
  onEatMeal: (type: 'regular' | 'lux') => void;
  onChill: (hours: number) => void;
  onWatchTv: (hours: number) => void;
  onOpenFurnitureSell: () => void;
  onOpenMapOverlay: () => void;
  groceryFreshness: { regular: number; lux: number };
  hasFridge: boolean;
  watchHappinessPerHour: number;
  npcInteractions: Record<NpcId, number>;
  datingPartnerId: NpcId | null;
  onTalkToNpc: (id: NpcId) => void;
  onStartDating: (id: NpcId) => void;
}

const BASE_ENERGY_PER_HOUR = 10;

export function HomeView({
  apartmentName,
  apartmentRent,
  isLiveWithParents,
  isHomeless = false,
  currentEnergy,
  currentHunger,
  groceries,
  fridgeGroceries,
  counterGroceries,
  fridgeMealCapacity,
  togoHome,
  togoFreshHome,
  onPrepareTogo,
  onStashTogo,
  homeFurniture,
  backpackId,
  snackCounts,
  backpackSpaceUsed,
  backpackCapacity,
  onEatSnack,
  onSleep,
  onEatMeal,
  onChill,
  onWatchTv,
  onOpenFurnitureSell,
  onOpenMapOverlay,
  groceryFreshness,
  hasFridge,
  watchHappinessPerHour,
  npcInteractions,
  datingPartnerId,
  onTalkToNpc,
  onStartDating,
}: HomeViewProps) {
  const samId = 'neighbor-sam' as const satisfies NpcId;
  const samCount = npcInteractions[samId] ?? 0;
  const [hours, setHours] = useState(4);
  const [chillHours, setChillHours] = useState(1);
  const [tvHours, setTvHours] = useState(2);

  const bedBonus = getSleepEnergyBonusPerHour(homeFurniture);
  const weeklyRent = apartmentRent > 0 ? Math.round((apartmentRent / 4) * 100) / 100 : 0;
  const cap = fridgeMealCapacity;
  const stoveBonus = getEatHungerBonus(homeFurniture);
  const decorBonus = getChillHappinessPerHour(homeFurniture);
  const chillHappiness = Math.round(chillHours * (2 + decorBonus));
  const chillEnergy = chillHours * 5;
  const chillHunger = chillHours * 10;

  const nextRegularAfterSpoil = Math.floor(counterGroceries.regular * 0.5);
  const nextLuxAfterSpoil = Math.floor(counterGroceries.lux * 0.5);
  const showCounterSpoil =
    !isLiveWithParents && hasFridge && cap != null && cap > 0 && (counterGroceries.regular > 0 || counterGroceries.lux > 0);

  const nextTogoRegAfterSpoil = Math.floor(togoHome.regular * 0.5);
  const nextTogoLuxAfterSpoil = Math.floor(togoHome.lux * 0.5);
  const showTogoSpoil = !isLiveWithParents && (togoHome.regular > 0 || togoHome.lux > 0);

  const canStashPacked =
    backpackCapacity > 0 && backpackSpaceUsed + TOGO_MEAL_SPACE_UNITS <= backpackCapacity;
  const canStashRegular = canStashPacked && togoHome.regular > 0;
  const canStashLux = canStashPacked && togoHome.lux > 0;

  return (
    <div className="w-full min-h-full flex flex-col gap-3">
      <Card className={`${gameChromePanel} w-full flex flex-col`}>
        <CardHeader
          className={`flex items-center justify-between gap-2 flex-shrink-0 py-2 px-3 ${gameChromePhaseCardHeader}`}
        >
          <div className="min-w-0">
            <CardTitle className="text-base flex items-center gap-2 text-slate-900">
              <Home className="size-4 text-sky-700" />
              <Tooltip delayDuration={150}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="cursor-help rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/45"
                    aria-label="Apartment info"
                  >
                    <span className="border-b border-dotted border-slate-500/70">{apartmentName}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  className={
                    'max-w-[min(22rem,92vw)] text-left !rounded-md ' +
                    '!bg-[#eef2f8] !text-slate-900 shadow-[4px_4px_0_0_rgba(15,23,42,0.22)] ' +
                    '!border-[3px] !border-[#1a2332] px-3 py-2.5 ' +
                    '[&>svg]:fill-[#eef2f8] [&>svg]:stroke-[#1a2332]'
                  }
                >
                  <div className="text-[11px] text-slate-900 space-y-1">
                    <div>
                      Sleep restores energy ({BASE_ENERGY_PER_HOUR}{bedBonus < 0 ? `${bedBonus}` : bedBonus > 0 ? `+${bedBonus}` : ''}/hr
                      {bedBonus < 0 ? ' due to bed penalty' : ''}).
                    </div>
                    {apartmentRent > 0 ? (
                      <div>
                        Rent: ${weeklyRent}/week (listed ${apartmentRent} per 28-day season)
                      </div>
                    ) : null}
                    <div>Buy furniture on the map — open any district and choose Furniture Store.</div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </CardTitle>
            <CardDescription className="text-xs text-slate-700">
              {isHomeless ? (
                <span className="block mt-1 text-amber-800">
                  You have no housing. Open the map and go to the Housing Office to rent a place.
                </span>
              ) : null}
            </CardDescription>
          </div>
          <div className="flex flex-col gap-1 items-stretch shrink-0">
            <Button variant="outline" size="sm" onClick={onOpenMapOverlay} className="text-xs">
              Map
            </Button>
            <Button variant="outline" size="sm" onClick={onOpenFurnitureSell} className="text-xs">
              Sell used…
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 px-3 sm:px-4 pb-4 pt-2">
          {!isHomeless && (
            <div
              className="relative w-[calc(100%+1.5rem)] max-w-none min-w-0 -mx-3 shrink-0 overflow-hidden rounded-none border-[3px] border-[#1a2332] shadow-[3px_3px_0_0_rgba(15,23,42,0.25)] sm:w-[calc(100%+2rem)] sm:-mx-4"
            >
              <img
                src="/assets/buildings/apartment.png"
                alt=""
                className="block h-auto w-full min-w-0 select-none [image-rendering:pixelated] [clip-path:inset(11%_5.5%_9%_5.5%)]"
                width={216}
                height={216}
                decoding="async"
              />
              {homeFurniture.bedId && (
                <img
                  src="/assets/furniture/simple_bed.png"
                  alt=""
                  className="pointer-events-none absolute bottom-[12%] left-[8%] z-10 w-[46%] max-h-[38%] h-auto object-contain object-bottom select-none [image-rendering:pixelated]"
                  width={120}
                  height={80}
                  decoding="async"
                />
              )}
            </div>
          )}
          {!isHomeless && (
            <div className="rounded-lg border border-sky-200 bg-sky-50/80 p-3 space-y-2">
              <p className="text-xs font-semibold text-gray-900">Neighbor</p>
              <p className="text-[11px] text-gray-600">Sam Rivera · down the hall</p>
              <p className="text-[11px] text-sky-950">
                {relationshipStageLabel(samCount, datingPartnerId === samId)} · {samCount} chat
                {samCount === 1 ? '' : 's'}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="secondary" onClick={() => onTalkToNpc(samId)}>
                  Talk
                </Button>
                {samCount >= 50 && datingPartnerId !== samId && (
                  <Button
                    type="button"
                    size="sm"
                    className="bg-rose-600 hover:bg-rose-700"
                    disabled={datingPartnerId != null}
                    onClick={() => onStartDating(samId)}
                  >
                    Ask out
                  </Button>
                )}
              </div>
              {datingPartnerId != null && datingPartnerId !== samId && samCount >= 50 && (
                <p className="text-[10px] text-amber-800">Ask out is unavailable while you&apos;re dating someone else.</p>
              )}
            </div>
          )}
          {/* Visual: items in your apartment */}
          <div className="rounded-xl border bg-gradient-to-b from-amber-50/80 to-stone-100/90 p-3 border-amber-200/60">
            <div className="text-[10px] font-semibold text-amber-900/80 uppercase tracking-wide mb-2">
              {isLiveWithParents ? 'Your room' : 'Your place'}
            </div>
            <div className="flex flex-wrap gap-2">
              {homeFurniture.bedId && (
                <div
                  className="flex flex-col items-center justify-center w-14 h-14 rounded-lg bg-white shadow-sm border text-[10px] text-center p-1"
                  title={FURNITURE_BY_ID[homeFurniture.bedId]?.name}
                >
                  <span className="text-xl leading-none">{FURNITURE_BY_ID[homeFurniture.bedId]?.icon ?? '🛏️'}</span>
                  <span className="truncate w-full mt-0.5">Bed</span>
                </div>
              )}
              {homeFurniture.fridgeId && (
                <div
                  className="flex flex-col items-center justify-center w-14 h-14 rounded-lg bg-white shadow-sm border text-[10px] text-center p-1"
                  title={FURNITURE_BY_ID[homeFurniture.fridgeId]?.name}
                >
                  <span className="text-xl leading-none">{FURNITURE_BY_ID[homeFurniture.fridgeId]?.icon ?? '🧊'}</span>
                  <span className="truncate w-full mt-0.5">Fridge</span>
                </div>
              )}
              {homeFurniture.tvId && (
                <div
                  className="flex flex-col items-center justify-center w-14 h-14 rounded-lg bg-white shadow-sm border text-[10px] text-center p-1"
                  title={FURNITURE_BY_ID[homeFurniture.tvId]?.name}
                >
                  <span className="text-xl leading-none">{FURNITURE_BY_ID[homeFurniture.tvId]?.icon ?? '📺'}</span>
                  <span className="truncate w-full mt-0.5">TV</span>
                </div>
              )}
              {homeFurniture.stoveId && (
                <div
                  className="flex flex-col items-center justify-center w-14 h-14 rounded-lg bg-white shadow-sm border text-[10px] text-center p-1"
                  title={FURNITURE_BY_ID[homeFurniture.stoveId]?.name}
                >
                  <span className="text-xl leading-none">{FURNITURE_BY_ID[homeFurniture.stoveId]?.icon ?? '🔥'}</span>
                  <span className="truncate w-full mt-0.5">Stove</span>
                </div>
              )}
              {homeFurniture.decorationIds.map((id) => {
                const d = FURNITURE_BY_ID[id];
                if (!d) return null;
                return (
                  <div
                    key={id}
                    className="flex flex-col items-center justify-center w-14 h-14 rounded-lg bg-white shadow-sm border text-[10px] text-center p-1"
                    title={d.name}
                  >
                    <span className="text-xl leading-none">{d.icon}</span>
                    <span className="truncate w-full mt-0.5">Decor</span>
                  </div>
                );
              })}
              {!homeFurniture.bedId &&
                !homeFurniture.fridgeId &&
                !homeFurniture.stoveId &&
                homeFurniture.decorationIds.length === 0 && (
                  <p className="text-[11px] text-stone-500 italic px-1">
                    Empty nest — visit the furniture store on the map to furnish your home.
                  </p>
                )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium">Sleep duration (hours)</label>
            <div className="flex gap-2 items-center">
              <input
                type="range"
                min={1}
                max={12}
                value={hours}
                onChange={(e) => setHours(Number(e.target.value))}
                className="flex-1"
              />
              <span className="text-sm font-bold w-8">{hours}h</span>
            </div>
            <p className="text-[11px] text-gray-500">
              Will restore +{Math.round(Math.min(hours * (BASE_ENERGY_PER_HOUR + bedBonus), 100 - currentEnergy))} energy
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => onSleep(hours)} className="bg-indigo-600 hover:bg-indigo-700">
              Sleep {hours} hour{hours > 1 ? 's' : ''}
            </Button>
            <Button variant="outline" onClick={() => onSleep(0.5)}>
              30-min nap
            </Button>
          </div>

          <div className="border-t pt-4 space-y-2">
            <label className="text-xs font-medium flex items-center gap-1">
              <Sparkles className="size-3.5 text-violet-500" />
              Chill at home
            </label>
            <p className="text-[11px] text-gray-600">
              Per hour: +happiness (decor helps), +5 energy, −10 hunger.
            </p>
            <div className="flex gap-2 items-center">
              <input
                type="range"
                min={1}
                max={4}
                value={chillHours}
                onChange={(e) => setChillHours(Number(e.target.value))}
                className="flex-1"
              />
              <span className="text-sm font-bold w-8">{chillHours}h</span>
            </div>
            <p className="text-[11px] text-violet-700">
              ~+{chillHappiness} happiness · +{chillEnergy} energy · −{chillHunger} hunger
            </p>
            <Button
              variant="secondary"
              className="bg-violet-100 text-violet-900 hover:bg-violet-200 border-violet-200"
              onClick={() => onChill(chillHours)}
            >
              Chill {chillHours}h
            </Button>
          </div>

          {watchHappinessPerHour > 0 && (
            <div className="border-t pt-4 space-y-2">
              <label className="text-xs font-medium">Watch TV</label>
              <p className="text-[11px] text-gray-600">
                Up to +{watchHappinessPerHour} happiness per in-game hour (depends on your TV).
              </p>
              <div className="flex gap-2 items-center">
                <input
                  type="range"
                  min={1}
                  max={4}
                  value={tvHours}
                  onChange={(e) => setTvHours(Number(e.target.value))}
                  className="flex-1"
                />
                <span className="text-sm font-bold w-8">{tvHours}h</span>
              </div>
              <p className="text-[11px] text-sky-800">
                ~+{Math.round(tvHours * watchHappinessPerHour)} happiness
              </p>
              <Button
                variant="secondary"
                className="bg-sky-100 text-sky-900 hover:bg-sky-200 border-sky-200"
                onClick={() => onWatchTv(tvHours)}
              >
                Watch {tvHours}h
              </Button>
            </div>
          )}

          {SNACK_TYPES.some((s) => (snackCounts[s.id] ?? 0) > 0) && (
            <div className="border-t pt-4 space-y-2">
              <label className="text-xs font-medium flex items-center gap-1">
                <UtensilsCrossed className="size-3.5" />
                Snacks from your backpack (~{Math.round(EAT_SNACK_HOURS * 60)} min each)
              </label>
              <p className="text-[11px] text-gray-600">
                Portable food you bought at the grocery store.
              </p>
              <div className="flex gap-2 flex-wrap">
                {SNACK_TYPES.map((s) => {
                  const n = snackCounts[s.id] ?? 0;
                  if (n <= 0) return null;
                  return (
                    <Button key={s.id} variant="outline" size="sm" onClick={() => onEatSnack(s.id)}>
                      {s.label} ×{n} (+{s.hunger})
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          {!isHomeless && (
            <div className="border-t pt-4 space-y-2">
              <Tooltip delayDuration={150}>
                <TooltipTrigger asChild>
                  <label className="text-xs font-medium flex items-center gap-1 cursor-help w-fit">
                    <UtensilsCrossed className="size-3.5" />
                    <span className="border-b border-dotted border-slate-500/70">Groceries at home</span>
                  </label>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  className={
                    'max-w-[min(22rem,92vw)] text-left !rounded-md ' +
                    '!bg-[#eef2f8] !text-slate-900 shadow-[4px_4px_0_0_rgba(15,23,42,0.22)] ' +
                    '!border-[3px] !border-[#1a2332] px-3 py-2.5 ' +
                    '[&>svg]:fill-[#eef2f8] [&>svg]:stroke-[#1a2332]'
                  }
                >
                  <div className="text-[11px] text-slate-900 space-y-2">
                    <div className="space-y-1">
                      <div className="font-semibold">Spoil bar is 0–100% only (full = freshest).</div>
                      <div>
                        When it hits 0%, the next spoil tick throws out ~half of that stack (~every 12 in-game hours on the
                        counter).
                      </div>
                      <div>Counter / overflow (no fridge space): ~50% lost per 12 in-game hours.</div>
                    </div>

                    {counterGroceries.regular > 0 && (
                      <div className="space-y-1">
                        <div className="text-slate-800">
                          Regular freshness {clampFreshnessPct(groceryFreshness.regular)}% · {counterGroceries.regular} →{' '}
                          {nextRegularAfterSpoil} meals after next tick
                        </div>
                        <Progress value={clampFreshnessPct(groceryFreshness.regular)} className="h-1.5" />
                      </div>
                    )}
                    {counterGroceries.lux > 0 && (
                      <div className="space-y-1">
                        <div className="text-slate-800">
                          Luxury freshness {clampFreshnessPct(groceryFreshness.lux)}% · {counterGroceries.lux} →{' '}
                          {nextLuxAfterSpoil} meals after next tick
                        </div>
                        <Progress value={clampFreshnessPct(groceryFreshness.lux)} className="h-1.5" />
                      </div>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
              <p className="text-[11px] text-gray-600">
                Meals in pantry: {groceries.regular} regular, {groceries.lux} luxury
                {hasFridge && cap != null && cap > 0 && !isLiveWithParents && (
                  <span className="block mt-1 text-emerald-800/90">
                    Fridge: {fridgeGroceries.regular + fridgeGroceries.lux}/{cap} portions safe · Counter (spoils):{' '}
                    {counterGroceries.regular} reg, {counterGroceries.lux} lux
                  </span>
                )}
                {showTogoSpoil && (
                  <span className="block mt-2 text-amber-900/85 space-y-1">
                    <span className="block font-medium">Packed to-go at home (only these can be stashed)</span>
                    {togoHome.regular > 0 && (
                      <span className="block">
                        Regular {clampFreshnessPct(togoFreshHome.regular)}% · {togoHome.regular} → {nextTogoRegAfterSpoil}{' '}
                        packed after next tick
                        <Progress value={clampFreshnessPct(togoFreshHome.regular)} className="h-1.5 mt-1" />
                      </span>
                    )}
                    {togoHome.lux > 0 && (
                      <span className="block">
                        Luxury {clampFreshnessPct(togoFreshHome.lux)}% · {togoHome.lux} → {nextTogoLuxAfterSpoil} packed
                        after next tick
                        <Progress value={clampFreshnessPct(togoFreshHome.lux)} className="h-1.5 mt-1" />
                      </span>
                    )}
                  </span>
                )}
                {groceries.regular === 0 && groceries.lux === 0 && (
                  <span className="block mt-1 text-amber-800/90">Buy meal bundles at the grocery store on the map.</span>
                )}
              </p>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={groceries.regular <= 0}
                  title={groceries.regular <= 0 ? 'No regular meals in your pantry' : undefined}
                  onClick={() => onEatMeal('regular')}
                >
                  Eat regular (+{30 + stoveBonus} hunger, 30 min)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={groceries.lux <= 0}
                  title={groceries.lux <= 0 ? 'No luxury meals in your pantry' : undefined}
                  onClick={() => onEatMeal('lux')}
                >
                  Eat luxury (+{50 + stoveBonus} hunger, 30 min)
                </Button>
              </div>
              <div className="flex flex-col gap-2 pt-2 border-t border-dashed">
                <p className="text-[11px] font-medium text-gray-700">Pack to-go</p>
                <p className="text-[10px] text-gray-600">
                  Packing only needs pantry food (no backpack space). Stashing packed meals into your backpack needs{' '}
                  {TOGO_MEAL_SPACE_UNITS} free space each.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={groceries.regular <= 0}
                    title={groceries.regular <= 0 ? 'No regular meals in your pantry' : undefined}
                    onClick={() => onPrepareTogo('regular')}
                  >
                    Pack regular to-go (15 min)
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={groceries.lux <= 0}
                    title={groceries.lux <= 0 ? 'No luxury meals in your pantry' : undefined}
                    onClick={() => onPrepareTogo('lux')}
                  >
                    Pack luxury to-go (15 min)
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={togoHome.regular <= 0 || !canStashRegular}
                    title={
                      togoHome.regular <= 0
                        ? 'Pack a regular meal first'
                        : !canStashPacked
                          ? backpackCapacity <= 0
                            ? 'Buy a backpack first'
                            : `Backpack full — free ${TOGO_MEAL_SPACE_UNITS} space to stash (${backpackSpaceUsed}/${backpackCapacity})`
                          : undefined
                    }
                    onClick={() => onStashTogo('regular')}
                  >
                    Stash packed regular{togoHome.regular > 0 ? ` (${togoHome.regular} waiting)` : ''}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={togoHome.lux <= 0 || !canStashLux}
                    title={
                      togoHome.lux <= 0
                        ? 'Pack a luxury meal first'
                        : !canStashPacked
                          ? backpackCapacity <= 0
                            ? 'Buy a backpack first'
                            : `Backpack full — free ${TOGO_MEAL_SPACE_UNITS} space (${backpackSpaceUsed}/${backpackCapacity})`
                          : undefined
                    }
                    onClick={() => onStashTogo('lux')}
                  >
                    Stash packed luxury{togoHome.lux > 0 ? ` (${togoHome.lux} waiting)` : ''}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
