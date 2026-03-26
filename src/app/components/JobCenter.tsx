import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Briefcase, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from './ui/tooltip';
import type { Job, Degree, JobSchedule } from './LifeSimGame';
import type { GameStats } from './LifeSimGame';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const WORK_ENERGY_COST: Record<'slack' | 'normal' | 'hard', number> = {
  slack: 10,
  normal: 25,
  hard: 40,
};

function formatDayOfWeek(dayOfYear: number): string {
  return DAY_NAMES[(dayOfYear - 1) % 7];
}

function formatTime(hour: number): string {
  const h = ((hour % 24) + 24) % 24;
  const wholeHour = Math.floor(h);
  const minutes = Math.round((h - wholeHour) * 60) % 60;
  const hour12 = wholeHour === 0 ? 12 : wholeHour > 12 ? wholeHour - 12 : wholeHour;
  const ampm = h < 12 ? 'AM' : 'PM';
  return `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
}

type EducationLevel = 'none' | 'in-progress' | 'completed';

interface JobCenterProps {
  mode?: 'selection' | 'work';
  jobs: Job[];
  selectedJob: Job | null;
  onSelectJob: (job: Job, schedule?: JobSchedule) => void;
  onWorkShift: (intensity?: 'slack' | 'normal' | 'hard') => void;
  onWorkOvertime: (intensity?: 'slack' | 'normal' | 'hard') => void;
  workHoursPerShift: number;
  canWorkNow: boolean;
  canWorkOvertimeNow: boolean;
  isFirstDayOfWork: boolean;
  isWeekday: boolean;
  onPassOneHour: () => void;
  jobSchedule: JobSchedule;
  setJobSchedule: (s: JobSchedule) => void;
  stats: GameStats;
  getSalaryPerDay: (job: Job) => number;
  getSalaryPerHour: (job: Job) => number;
  getEffectiveSalary: (job: Job) => number;
  getCurrentJobTitle: (job: Job) => string;
  promotionCheck: { allowed: boolean; reason?: string; chance?: number };
  onAskForPromotion: () => void;
  onOpenMapOverlay: () => void;
  educationLevel: EducationLevel;
  educationDegree: Degree | null;
}

export function JobCenter({
  mode = 'selection',
  jobs,
  selectedJob: currentJob,
  onSelectJob,
  onWorkShift,
  onWorkOvertime,
  workHoursPerShift,
  canWorkNow,
  canWorkOvertimeNow,
  isFirstDayOfWork,
  isWeekday,
  onPassOneHour,
  jobSchedule,
  setJobSchedule,
  stats,
  getSalaryPerDay,
  getSalaryPerHour,
  getEffectiveSalary,
  getCurrentJobTitle,
  promotionCheck,
  onAskForPromotion,
  onOpenMapOverlay,
  educationLevel,
  educationDegree,
}: JobCenterProps) {
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [pendingSchedule, setPendingSchedule] = useState<JobSchedule>('full-time');
  const [workIntensity, setWorkIntensity] = useState<'slack' | 'normal' | 'hard'>('normal');

  const canTakeJob = (job: Job) => {
    if (!job.requiredDegree) return true;
    return educationLevel === 'completed' && educationDegree === job.requiredDegree;
  };

  const getScheduleText = (job: Job) => {
    if (job.workStartHour === 0 && job.workEndHourFull === 24) return 'Flexible (40 hr/week)';
    const endPart = job.workEndHourPart != null ? `${formatTime(job.workStartHour)}–${formatTime(job.workEndHourPart)}` : null;
    const endFull = `${formatTime(job.workStartHour)}–${formatTime(job.workEndHourFull)}`;
    if (job.allowsPartTime) return `Full 40hr: Mon–Fri ${endFull} · Part 20hr: Mon–Fri ${endPart ?? endFull}`;
    return `Mon–Fri ${endFull} (40 hr/week)`;
  };

  const handleAcceptJob = () => {
    if (selectedJob) {
      const sched = selectedJob.allowsPartTime ? pendingSchedule : 'full-time';
      onSelectJob(selectedJob, sched);
      setSelectedJob(null);
    }
  };

  return (
    <Card className="h-full flex flex-col min-h-0">
      <CardHeader className="flex items-center justify-between gap-2 flex-shrink-0 py-2">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            {mode === 'work' ? <Clock className="size-4 text-blue-500" /> : <Briefcase className="size-4 text-blue-500" />}
            {mode === 'work' ? 'Workplace' : 'Job Office'}
          </CardTitle>
          <CardDescription className="text-xs">
            {mode === 'work' ? 'Work during scheduled hours for full pay.' : 'Pick a job offer. You work it at the workplace.'}
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={onOpenMapOverlay} className="text-xs">
          Map
        </Button>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 overflow-y-auto space-y-3 py-2">
        {mode === 'work' && currentJob && (
          <div className="p-3 rounded-lg border-2 border-blue-200 bg-blue-50">
            <p className="text-sm font-semibold text-gray-900 mb-1">
              Current job: {getCurrentJobTitle(currentJob)}
            </p>
            <p className="text-xs text-gray-600 mb-1">
              ${getSalaryPerDay(currentJob).toFixed(2)}/day (${getSalaryPerHour(currentJob).toFixed(2)}/hr)
            </p>
            <p className="text-[11px] text-gray-600 mb-2 flex items-center gap-1">
              <Clock className="size-3" />
              {getScheduleText(currentJob)} 
            </p>
            <div className="flex flex-col gap-1.5">
              <div className="flex gap-1 flex-wrap text-[10px]">
                {(['slack', 'normal', 'hard'] as const).map((int) => (
                  <button
                    key={int}
                    type="button"
                    onClick={() => setWorkIntensity(int)}
                    className={`px-2 py-0.5 rounded font-medium ${
                      workIntensity === int
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {int === 'slack' ? 'Slack' : int === 'hard' ? 'Hard' : 'Normal'}
                  </button>
                ))}
              </div>
              <div className="flex gap-1.5 flex-wrap items-center">
                <Button variant="outline" size="sm" onClick={onPassOneHour} className="text-xs h-7">
                  Pass 1 Hr
                </Button>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-block">
                      <Button
                        onClick={() => onWorkShift(workIntensity)}
                        className="bg-blue-600 hover:bg-blue-700"
                        size="sm"
                        disabled={!canWorkNow}
                      >
                        Work ({workHoursPerShift} hr)
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    {canWorkNow
                      ? `${workIntensity === 'slack' ? 'Slack' : workIntensity === 'hard' ? 'Hard' : 'Normal'} — ${workIntensity === 'slack' ? 'less perf gain, less happiness loss' : workIntensity === 'hard' ? 'more perf gain, more happiness loss' : 'balanced'}. Energy: -${WORK_ENERGY_COST[workIntensity]}`
                      : isFirstDayOfWork
                        ? 'Come back tomorrow for your first day of work!'
                        : !isWeekday && currentJob && currentJob.workStartHour !== 0
                          ? "It's the weekend — work Mon–Fri only"
                          : 'Outside work hours — come back during your shift'}
                  </TooltipContent>
                </Tooltip>
                {canWorkOvertimeNow && (
                  <Button
                    onClick={() => onWorkOvertime(workIntensity)}
                    variant="outline"
                    size="sm"
                  >
                    Overtime (+2 hr)
                  </Button>
                )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-block">
                    <Button
                      onClick={onAskForPromotion}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      disabled={!promotionCheck.allowed}
                    >
                      Ask for promotion
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  {promotionCheck.allowed
                    ? `Request a promotion. Chance ≈ ${promotionCheck.chance != null ? (promotionCheck.chance * 100).toFixed(0) : '??'}%. Pay and title will increase.`
                    : promotionCheck.reason ?? 'Not eligible for promotion yet.'}
                </TooltipContent>
              </Tooltip>
              </div>
            </div>
          </div>
        )}

        {mode === 'selection' ? (
          <>
            <div>
              <p className="text-xs font-medium text-gray-700 mb-1.5">
                {currentJob ? 'Change job or pick a new one' : 'Pick a job'}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {jobs.map((job) => {
                  const available = canTakeJob(job);
                  const degreeLabel = job.requiredDegree
                    ? `${job.requiredDegree.charAt(0).toUpperCase()}${job.requiredDegree.slice(1)}`
                    : null;
                  return (
                    <motion.div
                      key={job.id}
                      whileHover={available ? { scale: 1.02 } : {}}
                      whileTap={available ? { scale: 0.98 } : {}}
                      className={`border-2 p-3 rounded-lg transition-all ${
                        available
                          ? 'border-gray-200 hover:border-purple-400 hover:shadow-xl cursor-pointer bg-white'
                          : 'border-gray-200 bg-gray-100 opacity-70 cursor-not-allowed'
                      }`}
                      onClick={() => {
                        if (available) {
                          setSelectedJob(job);
                          setPendingSchedule(job.allowsPartTime ? 'part-time' : 'full-time');
                        }
                      }}
                    >
                      <div className="flex items-start gap-2 mb-2">
                        <div className="bg-gradient-to-br from-blue-400 to-blue-600 p-2 rounded-lg">
                          <Briefcase className="size-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-bold">{job.name}</h3>
                          <p className="text-xs text-gray-600 line-clamp-2">{job.description}</p>
                        </div>
                      </div>
                      <div className="bg-green-50 p-2 rounded-lg mb-1.5">
                        <div className="text-sm font-bold text-green-700">
                          ${getSalaryPerDay(job).toFixed(2)}/day · ${getSalaryPerHour(job).toFixed(2)}/hr
                        </div>
                        <div className="text-xs text-green-600 mt-0.5">
                          ${(getSalaryPerDay(job) * 7).toFixed(2)}/week · ${getEffectiveSalary(job).toFixed(2)}/season
                        </div>
                      </div>
                      <p className="text-[11px] text-gray-500 mb-1.5">{getScheduleText(job)}</p>
                      {!available && degreeLabel && (
                        <p className="text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded mt-1">
                          Requires {degreeLabel} degree
                        </p>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {selectedJob && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 border-2 border-purple-400 p-3 rounded-lg bg-white shadow-lg"
              >
                <h3 className="text-base font-bold mb-1">{selectedJob.name}</h3>
                <p className="text-xs text-gray-600 mb-2 line-clamp-2">{selectedJob.description}</p>
                {selectedJob.allowsPartTime && (
                  <div className="mb-2">
                    <p className="text-xs font-medium text-gray-700 mb-1">Schedule</p>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setPendingSchedule('full-time')}
                        className={`px-3 py-1.5 rounded text-xs font-medium ${
                          pendingSchedule === 'full-time'
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Full-time (40 hr)
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingSchedule('part-time')}
                        className={`px-3 py-1.5 rounded text-xs font-medium ${
                          pendingSchedule === 'part-time'
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Part-time (20 hr)
                      </button>
                    </div>
                  </div>
                )}
                <Button
                  onClick={handleAcceptJob}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-sm h-8"
                >
                  Accept Job Offer
                </Button>
              </motion.div>
            )}
          </>
        ) : (
          <div className="p-3 text-xs text-gray-500">
            {currentJob ? 'Your workplace. Job offers are at the Job Office.' : 'No job yet — visit the Job Office to pick one.'}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
