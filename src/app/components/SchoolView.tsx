import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import type { Degree } from './LifeSimGame';

type EducationLevel = 'none' | 'in-progress' | 'completed';
type StudyIntensity = 'slack' | 'normal' | 'focus';

interface SchoolViewProps {
  educationLevel: EducationLevel;
  educationDegree: Degree | null;
  educationProgress: number;
  currentMoney: number;
  currentRent: number;
  dayOfYear: number;
  onStartDegree: (degree: Degree) => void;
  onStudy: (intensity: StudyIntensity, hours: number) => void;
  onOpenMapOverlay: () => void;
}

const DEGREE_DAYS_NORMAL = 80;
const STUDY_HOURS_PER_DAY = 8; // 8 hours = same effects as old "study day"
const TUITION_PER_YEAR = 4000;

export function SchoolView({
  educationLevel,
  educationDegree,
  educationProgress,
  currentMoney,
  currentRent,
  dayOfYear,
  onStartDegree,
  onStudy,
  onOpenMapOverlay,
}: SchoolViewProps) {
  const degrees: { id: Degree; label: string; description: string; note: string }[] = [
    {
      id: 'accounting',
      label: 'Accounting',
      description: 'Learn bookkeeping, tax, and financial reporting.',
      note: 'Unlocks office and accounting careers.',
    },
    {
      id: 'engineering',
      label: 'Engineering',
      description: 'Study math, physics, and building complex systems.',
      note: 'Unlocks technical and engineering careers.',
    },
    {
      id: 'doctor',
      label: 'Doctor (Med School)',
      description: 'Long, intense medical training to become a doctor.',
      note: 'Requires full med school but unlocks doctor careers.',
    },
    {
      id: 'finance',
      label: 'Finance',
      description: 'Dive into markets, investing, and corporate finance.',
      note: 'Unlocks high-paying finance careers.',
    },
  ];

  const hasActiveDegree =
    educationLevel === 'in-progress' && educationDegree !== null;

  const [hours, setHours] = useState(2);

  const [degreeToEnroll, setDegreeToEnroll] = useState<Degree | null>(null);

  const TUITION_PER_SEASON = TUITION_PER_YEAR / 4;
  const SEASON_END_DAYS = [28, 56, 84, 112];
  const seasonEnd = SEASON_END_DAYS.find((d) => d >= dayOfYear) ?? 112;
  const daysLeftInSeason = seasonEnd - dayOfYear + 1;
  const isProrated = daysLeftInSeason < 28;
  const tuitionForSeason = isProrated
    ? Math.round((daysLeftInSeason / 28) * TUITION_PER_SEASON)
    : TUITION_PER_SEASON;

  return (
    <Card>
      <CardHeader className="flex items-center justify-between gap-4">
        <div>
          <CardTitle className="text-2xl">Choose Your Degree</CardTitle>
          <CardDescription>
            Pick what you want to study. Set study hours (8 hours = 1 day&apos;s progress). At normal effort, 80 &quot;study days&quot; (8h each) complete the degree.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={onOpenMapOverlay}>
          Map
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {degrees.map((degree) => {
            const isCompleted =
              educationLevel === 'completed' && educationDegree === degree.id;
            const isActive =
              educationLevel === 'in-progress' && educationDegree === degree.id;

            return (
              <motion.div
                key={degree.id}
                whileHover={{ scale: isCompleted ? 1 : 1.02 }}
                whileTap={{ scale: isCompleted ? 1 : 0.98 }}
                className={`border-2 p-5 rounded-lg bg-white transition-all ${
                  isCompleted
                    ? 'border-green-400 bg-green-50 cursor-default'
                    : isActive
                      ? 'border-purple-400 bg-purple-50 cursor-default'
                      : 'border-gray-200 hover:border-purple-400 hover:shadow-xl cursor-pointer'
                }`}
                onClick={() => {
                  if (!isCompleted && !hasActiveDegree) {
                    setDegreeToEnroll(degree.id);
                  }
                }}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <h3 className="text-lg font-bold">{degree.label}</h3>
                    <p className="text-sm text-gray-600">{degree.description}</p>
                  </div>
                  {isCompleted && (
                    <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-1 rounded-full">
                      Completed
                    </span>
                  )}
                  {isActive && (
                    <span className="text-xs font-semibold text-purple-700 bg-purple-100 px-2 py-1 rounded-full">
                      In progress
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-2">{degree.note}</p>
                {!isCompleted && !isActive && !hasActiveDegree && (
                  <p className="text-xs text-purple-600 mt-2">
                    Click to start this degree.
                  </p>
                )}
              </motion.div>
            );
          })}
        </div>

        <Dialog open={degreeToEnroll !== null} onOpenChange={(open) => !open && setDegreeToEnroll(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Enroll in this degree?</DialogTitle>
              <DialogDescription>
                {degreeToEnroll && (
                  <>
                    You will be enrolled in the {degreeToEnroll.charAt(0).toUpperCase()}{degreeToEnroll.slice(1)} program.
                    Tuition for this season{isProrated ? ` (prorated, ${daysLeftInSeason} days left)` : ''} will be{' '}
                    <strong>${tuitionForSeason.toLocaleString()}</strong>. You will not be charged additional tuition per study day this season. Are you sure?
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDegreeToEnroll(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (degreeToEnroll) {
                    onStartDegree(degreeToEnroll);
                    setDegreeToEnroll(null);
                  }
                }}
              >
                Yes, enroll
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {hasActiveDegree && educationDegree && (
          <div className="mt-4 space-y-3 border-t pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">
                  Current degree:{' '}
                  {educationDegree.charAt(0).toUpperCase()}
                  {educationDegree.slice(1)}
                </p>
                <p className="text-xs text-gray-600">
                  Choose study hours and effort level. 8 hours = 1 day&apos;s progress. Tuition paid; no cost to study.
                </p>
              </div>
              <div className="w-40">
                <Progress value={educationProgress} className="h-2" />
                <p className="text-xs text-right text-gray-600 mt-1">
                  {educationProgress.toFixed(2)}%
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-500">
              Enrolled students can move to University District Housing (Housing Office) for a lower student rate ($200/season).
            </p>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium">Study duration (hours)</label>
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
                Tuition paid; no cost to study.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onStudy('slack', hours)}
              >
                Slack
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onStudy('normal', hours)}
              >
                Normal
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onStudy('focus', hours)}
              >
                Focused
              </Button>
            </div>

            <div className="text-xs text-gray-600 space-y-1">
              <p>Slack: slower progress, keeps happiness higher.</p>
              <p>Normal: balanced progress, moderate stress.</p>
              <p>Focused: fastest progress, more stress, more smarts gain.</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

