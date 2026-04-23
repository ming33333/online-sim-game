import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { Trees } from 'lucide-react';
import type { WeatherConditions } from '../lib/weather';
import { gameChromePanel, gameChromePhaseCardHeader } from '../lib/gameChrome';
import { isGoodWeatherForWalk } from '../lib/weather';
import { PARK_WALK_SOCIAL_GAIN } from '../../game/constants';
import type { DistrictName } from './LifeSimGame';
import { relationshipStageLabel, type NpcId } from '../lib/relationships';

interface ParkViewProps {
  currentEnergy: number;
  currentWeather: WeatherConditions | null;
  onWalk: () => void;
  onOpenMapOverlay: () => void;
  parkDistrict: DistrictName | null;
  npcInteractions: Record<NpcId, number>;
  datingPartnerId: NpcId | null;
  onTalkToNpc: (id: NpcId) => void;
  onStartDating: (id: NpcId) => void;
}

const PARK_ENERGY_COST = 10;
const PARK_HEALTH_GAIN = 1;
const PARK_HUNGER_COST = 5;

export function ParkView({
  currentEnergy,
  currentWeather,
  onWalk,
  onOpenMapOverlay,
  parkDistrict,
  npcInteractions,
  datingPartnerId,
  onTalkToNpc,
  onStartDating,
}: ParkViewProps) {
  const niceWeather = currentWeather && isGoodWeatherForWalk(currentWeather.quality);
  const jordanId = 'park-jordan' as const satisfies NpcId;
  const jordanCount = npcInteractions[jordanId] ?? 0;
  const showJordan = parkDistrict === 'Centerlight';
  return (
    <Card className={`${gameChromePanel} w-full min-h-full flex flex-col`}>
      <CardHeader
        className={`flex items-center justify-between gap-2 flex-shrink-0 py-2 px-3 ${gameChromePhaseCardHeader}`}
      >
        <div className="min-w-0">
          <CardTitle className="text-base flex items-center gap-2 text-slate-900">
            <Trees className="size-4 text-emerald-700" />
            Park
          </CardTitle>
          <CardDescription className="text-xs text-slate-700">
            A one-hour walk: +health and a little social skill, but it costs energy and makes you hungrier.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={onOpenMapOverlay} className="text-xs shrink-0">
          Map
        </Button>
      </CardHeader>
      <CardContent className="px-3 sm:px-4 pb-4 pt-2">
        <p className="text-xs text-gray-600 mb-3">
          {`Walk for 1 hour · Health: +${PARK_HEALTH_GAIN} · Social skill +${PARK_WALK_SOCIAL_GAIN} · Energy: −${PARK_ENERGY_COST} · Hunger: −${PARK_HUNGER_COST}`}
          {niceWeather ? ' · Happiness +1 (nice weather!)' : ''}
        </p>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-block w-full">
              <Button
                onClick={onWalk}
                disabled={currentEnergy < PARK_ENERGY_COST}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                Walk 1 hour
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs text-left">
            {currentEnergy < PARK_ENERGY_COST
              ? `Not enough energy — walking needs at least ${PARK_ENERGY_COST} (you have ${Math.floor(currentEnergy)}).`
              : `1 hour walk: +${PARK_HEALTH_GAIN} health${niceWeather ? ', +1 happiness (nice weather)' : ''}, −${PARK_ENERGY_COST} energy, −${PARK_HUNGER_COST} hunger.`}
          </TooltipContent>
        </Tooltip>

        {showJordan && (
          <div className="mt-4 rounded-lg border border-teal-200 bg-teal-50/80 p-3 space-y-2">
            <p className="text-xs font-semibold text-gray-900">Someone at the path</p>
            <p className="text-[11px] text-gray-600">Jordan Lee · Centerlight regular</p>
            <p className="text-[11px] text-teal-950">
              {relationshipStageLabel(jordanCount, datingPartnerId === jordanId)} · {jordanCount} chat
              {jordanCount === 1 ? '' : 's'}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="secondary" onClick={() => onTalkToNpc(jordanId)}>
                Talk
              </Button>
              {jordanCount >= 50 && datingPartnerId !== jordanId && (
                <Button
                  type="button"
                  size="sm"
                  className="bg-rose-600 hover:bg-rose-700"
                  disabled={datingPartnerId != null}
                  onClick={() => onStartDating(jordanId)}
                >
                  Ask out
                </Button>
              )}
            </div>
            {datingPartnerId != null && datingPartnerId !== jordanId && jordanCount >= 50 && (
              <p className="text-[10px] text-amber-800">Ask out is unavailable while you&apos;re dating someone else.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
