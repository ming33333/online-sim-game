import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { Dumbbell } from 'lucide-react';

export type GymTier = 'cheap' | 'normal' | 'luxury';

interface Gym {
  id: GymTier;
  name: string;
  costPerWeek: number;
  happinessOnWorkout: number; // cheap: -2, normal: 0, luxury: +2
}

const GYMS: Gym[] = [
  { id: 'cheap', name: 'Budget Gym', costPerWeek: 50, happinessOnWorkout: -2 },
  { id: 'normal', name: 'FitZone', costPerWeek: 100, happinessOnWorkout: 0 },
  { id: 'luxury', name: 'Elite Wellness', costPerWeek: 200, happinessOnWorkout: 2 },
];

type WorkoutIntensity = 'easy' | 'normal' | 'intense';

const WORKOUT = {
  easy: { energyCost: 2, healthGain: 0.5 },
  normal: { energyCost: 5, healthGain: 1.5 },
  intense: { energyCost: 10, healthGain: 3 },
} satisfies Record<WorkoutIntensity, { energyCost: number; healthGain: number }>;

interface GymViewProps {
  currentMoney: number;
  currentEnergy: number;
  gymMembership: GymTier | null;
  onSelectMembership: (tier: GymTier) => void;
  onWorkout: (tier: GymTier, intensity: WorkoutIntensity) => void;
  onOpenMapOverlay: () => void;
}

export function GymView({
  currentMoney,
  currentEnergy,
  gymMembership,
  onSelectMembership,
  onWorkout,
  onOpenMapOverlay,
}: GymViewProps) {
  const [selectedIntensity, setSelectedIntensity] = useState<WorkoutIntensity>('normal');
  const [pendingGymSwitch, setPendingGymSwitch] = useState<GymTier | null>(null);

  const handleSwitchClick = (gym: Gym) => {
    if (gym.id === gymMembership || currentMoney < gym.costPerWeek) return;
    setPendingGymSwitch(gym.id);
  };

  const confirmSwitch = () => {
    if (pendingGymSwitch) {
      onSelectMembership(pendingGymSwitch);
      setPendingGymSwitch(null);
    }
  };

  return (
    <Card className="h-full flex flex-col min-h-0">
      <CardHeader className="flex items-center justify-between gap-2 flex-shrink-0 py-2">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <Dumbbell className="size-4" />
            Gym
          </CardTitle>
          <CardDescription className="text-xs">
            Work out to improve health. Choose a membership to start.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={onOpenMapOverlay} className="text-xs">
          Map
        </Button>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 overflow-y-auto space-y-4">
        {!gymMembership ? (
          <div className="space-y-2">
            <p className="text-xs font-medium">Select a membership (per week)</p>
            {GYMS.map((gym) => (
              <div
                key={gym.id}
                className="border-2 border-gray-200 p-3 rounded-lg hover:border-purple-400 cursor-pointer transition-all bg-white"
                onClick={() => currentMoney >= gym.costPerWeek && onSelectMembership(gym.id)}
              >
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-sm">{gym.name}</span>
                  <span className="text-sm">${gym.costPerWeek}/week</span>
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  Workout: {gym.happinessOnWorkout > 0 ? '+' : ''}{gym.happinessOnWorkout} happiness
                </p>
                {currentMoney < gym.costPerWeek && (
                  <p className="text-xs text-red-600 mt-1">Can&apos;t afford</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <>
            <p className="text-xs font-medium text-gray-700 mb-2">Current: {GYMS.find((g) => g.id === gymMembership)?.name}</p>
            <p className="text-[11px] text-gray-500 mb-2">Switch gym</p>
            <div className="flex gap-2 flex-wrap mb-3">
              {GYMS.map((gym) => (
                <div
                  key={gym.id}
                  className={`border-2 p-2 rounded-lg cursor-pointer transition-all flex-1 min-w-[80px] ${
                    gym.id === gymMembership
                      ? 'border-green-400 bg-green-50'
                      : 'border-gray-200 hover:border-purple-400 bg-white'
                  }`}
                  onClick={() => handleSwitchClick(gym)}
                >
                  <div className="text-xs font-semibold">{gym.name}</div>
                  <div className="text-[10px] text-gray-600">${gym.costPerWeek}/wk</div>
                  {gym.id === gymMembership && <div className="text-[10px] text-green-600">Current</div>}
                  {gym.id !== gymMembership && currentMoney < gym.costPerWeek && (
                    <div className="text-[10px] text-red-600">Can&apos;t afford</div>
                  )}
                </div>
              ))}
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
                Energy: -{WORKOUT[selectedIntensity].energyCost} · Health: +{WORKOUT[selectedIntensity].healthGain}
              </p>
            </div>
            <Button
              onClick={() => onWorkout(gymMembership, selectedIntensity)}
              disabled={currentEnergy < WORKOUT[selectedIntensity].energyCost}
              className="w-full"
            >
              Work out 1 hour
            </Button>
          </>
        )}
      </CardContent>

      <AlertDialog open={pendingGymSwitch != null} onOpenChange={(open) => !open && setPendingGymSwitch(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Switch gym membership?</AlertDialogTitle>
            <AlertDialogDescription>
              You won&apos;t get your money back for this week. The new gym will charge you a prorated amount for the rest of this week. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSwitch}>Yes, switch</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
