import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Trees } from 'lucide-react';
import type { WeatherConditions } from '../lib/weather';
import { isGoodWeatherForWalk } from '../lib/weather';

interface ParkViewProps {
  currentEnergy: number;
  currentWeather: WeatherConditions | null;
  onWalk: () => void;
  onOpenMapOverlay: () => void;
}

const PARK_ENERGY_COST = 1;
const PARK_HEALTH_GAIN = 0.3;

export function ParkView({
  currentEnergy,
  currentWeather,
  onWalk,
  onOpenMapOverlay,
}: ParkViewProps) {
  const niceWeather = currentWeather && isGoodWeatherForWalk(currentWeather.quality);
  return (
    <Card className="h-full flex flex-col min-h-0">
      <CardHeader className="flex items-center justify-between gap-2 flex-shrink-0 py-2">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <Trees className="size-4 text-green-600" />
            Park
          </CardTitle>
          <CardDescription className="text-xs">
            Free walking! Light exercise for a small health boost.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={onOpenMapOverlay} className="text-xs">
          Map
        </Button>
      </CardHeader>
      <CardContent className="flex-1 min-h-0">
        <p className="text-xs text-gray-600 mb-3">
          Walk for 1 hour · Energy: -{PARK_ENERGY_COST} · Health: +{PARK_HEALTH_GAIN}
          {niceWeather && ' · Happiness +1 (nice weather!)'}
        </p>
        <Button
          onClick={onWalk}
          disabled={currentEnergy < PARK_ENERGY_COST}
          className="w-full bg-green-600 hover:bg-green-700"
        >
          Walk 1 hour (Free)
        </Button>
      </CardContent>
    </Card>
  );
}
