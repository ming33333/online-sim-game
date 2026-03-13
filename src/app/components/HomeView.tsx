import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Home, UtensilsCrossed } from 'lucide-react';

interface HomeViewProps {
  apartmentName: string;
  apartmentRent: number; // per season
  currentEnergy: number;
  currentHunger: number;
  groceries: { regular: number; lux: number };
  onSleep: (hours: number) => void;
  onEatMeal: (type: 'regular' | 'lux') => void;
  onOpenMapOverlay: () => void;
}

const ENERGY_PER_HOUR = 10;

export function HomeView({
  apartmentName,
  apartmentRent,
  currentEnergy,
  currentHunger,
  groceries,
  onSleep,
  onEatMeal,
  onOpenMapOverlay,
}: HomeViewProps) {
  const [hours, setHours] = useState(4);

  const energyGain = Math.min(hours * ENERGY_PER_HOUR, 100 - currentEnergy);

  return (
    <Card className="h-full flex flex-col min-h-0">
      <CardHeader className="flex items-center justify-between gap-2 flex-shrink-0 py-2">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <Home className="size-4" />
            {apartmentName}
          </CardTitle>
          <CardDescription className="text-xs">
            Sleep to restore energy. Each hour restores {ENERGY_PER_HOUR} energy.
            {apartmentRent > 0 && (
              <span className="block mt-1 text-gray-600">Rent: ${apartmentRent}/season</span>
            )}
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={onOpenMapOverlay} className="text-xs">
          Map
        </Button>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 space-y-4">
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
            Will restore +{Math.min(hours * ENERGY_PER_HOUR, 100 - currentEnergy)} energy
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => onSleep(hours)}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            Sleep {hours} hour{hours > 1 ? 's' : ''}
          </Button>
          <Button
            variant="outline"
            onClick={() => onSleep(2)}
          >
            2-Hour Nap
          </Button>
        </div>

        {(groceries.regular > 0 || groceries.lux > 0) && (
          <div className="border-t pt-4 space-y-2">
            <label className="text-xs font-medium flex items-center gap-1">
              <UtensilsCrossed className="size-3.5" />
              Eat a meal (15 mins, restores hunger)
            </label>
            <p className="text-[11px] text-gray-600">Meals left: {groceries.regular} regular, {groceries.lux} luxury</p>
            <div className="flex gap-2">
              {groceries.regular > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEatMeal('regular')}
                >
                  Regular meal (+30 hunger)
                </Button>
              )}
              {groceries.lux > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEatMeal('lux')}
                >
                  Luxury meal (+50 hunger)
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
