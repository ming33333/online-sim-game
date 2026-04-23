import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Briefcase, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from './ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './ui/alert-dialog';
import type { Job, Degree, JobSchedule } from './LifeSimGame';
import type { GameStats } from './LifeSimGame';
import { WORK_ENERGY_MULTIPLIER, WORK_CAFETERIA_MEALS } from '../../game/constants';
import { formatMoney } from '../lib/formatNumber';
import { gameChromePanel, gameChromePhaseCardHeader, gameChromePanelHeader, gameChromePanelMuted } from '../lib/gameChrome';

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
  onWorkShift: (intensity: 'slack' | 'normal' | 'hard', workHours: number) => void;
  onWorkOvertime: (intensity: 'slack' | 'normal' | 'hard') => void;
  workHoursPerShift: number;
  maxWorkHours: number;
  canWorkNow: boolean;
  canWorkOvertimeNow: boolean;
  isFirstDayOfWork: boolean;
  isWeekday: boolean;
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
  /** Workplace only — buy & eat a cafeteria meal (time passes; meal break before first clock-in doesn’t count as late). */
  onCafeteriaMeal?: (hunger: number, cost: number, eatHours: number, label: string) => void;
  /** Job Office (selection mode): open 8–6; when false, browsing offers is closed. */
  jobOfficeOpen?: boolean;
  /** Job Office (selection): leave current employment. */
  onQuitJob?: () => void;
}

export function JobCenter({
  mode = 'selection',
  jobs,
  selectedJob: currentJob,
  onSelectJob,
  onWorkShift,
  onWorkOvertime,
  workHoursPerShift,
  maxWorkHours,
  canWorkNow,
  canWorkOvertimeNow,
  isFirstDayOfWork,
  isWeekday,
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
  onCafeteriaMeal,
  jobOfficeOpen = true,
  onQuitJob,
}: JobCenterProps) {
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [pendingSchedule, setPendingSchedule] = useState<JobSchedule>('full-time');
  const [workIntensity, setWorkIntensity] = useState<'slack' | 'normal' | 'hard'>('normal');
  const [workHours, setWorkHours] = useState(4);

  useEffect(() => {
    setWorkHours((h) => Math.min(Math.max(1, h), Math.max(1, maxWorkHours)));
  }, [maxWorkHours]);

  const cafeteriaOpen = canWorkNow || canWorkOvertimeNow;

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
    <Card className={`${gameChromePanel} w-full min-h-full flex flex-col`}>
      <CardHeader
        className={`flex items-center justify-between gap-2 flex-shrink-0 py-2 px-3 ${gameChromePhaseCardHeader}`}
      >
        <div className="min-w-0">
          <CardTitle className="text-base flex items-center gap-2 text-slate-900">
            {mode === 'work' ? (
              <Clock className="size-4 text-sky-700" />
            ) : (
              <Briefcase className="size-4 text-sky-700" />
            )}
            {mode === 'work' ? 'Workplace' : 'Job Office'}
          </CardTitle>
          <CardDescription className="text-xs text-slate-700">
            {mode === 'work' ? 'Work during scheduled hours for full pay.' : 'Pick a job offer. You work it at the workplace.'}
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={onOpenMapOverlay} className="text-xs shrink-0">
          Map
        </Button>
      </CardHeader>
      <CardContent className="space-y-3 py-2 px-3 sm:px-4 pb-4">
        {mode === 'work' && currentJob && (
          <div className="p-3 rounded-lg border-2 border-blue-200 bg-blue-50">
            <p className="text-sm font-semibold text-gray-900 mb-1">
              Current job: {getCurrentJobTitle(currentJob)}
            </p>
            <p className="text-xs text-gray-600 mb-1">
              ${formatMoney(getSalaryPerDay(currentJob))}/day (${formatMoney(getSalaryPerHour(currentJob))}/hr)
            </p>
            <p className="text-[11px] text-gray-600 mb-2 flex items-center gap-1">
              <Clock className="size-3" />
              {getScheduleText(currentJob)}
            </p>
            <p className="text-[10px] text-gray-500 mb-2">Workplace district: {currentJob.district}</p>
            {onCafeteriaMeal && (
              <div className="mb-3 p-3 rounded-lg border-2 border-emerald-200 bg-emerald-50/90">
                <p className="text-xs font-semibold text-gray-900 mb-0.5">Cafeteria</p>
                {cafeteriaOpen ? (
                  <>
                    <p className="text-[10px] text-gray-600 mb-2">
                      Open during your shift (or overtime hour). Time passes while you eat. Food before your first
                      &quot;Work&quot; click today won&apos;t make you late for performance.
                    </p>
                    <div className="flex flex-col gap-1.5">
                      {WORK_CAFETERIA_MEALS.map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center justify-between gap-2 text-xs bg-white/90 rounded-md border border-emerald-100 px-2 py-1.5"
                        >
                          <div className="min-w-0">
                            <span className="font-medium">{m.label}</span>
                            <span className="text-gray-600 block text-[10px]">
                              +{m.hunger} hunger · ~{Math.round(m.eatHours * 60)} min · ${formatMoney(m.cost)}
                            </span>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="shrink-0 h-7 text-[11px]"
                            disabled={stats.money < m.cost}
                            title={stats.money < m.cost ? 'Not enough cash' : undefined}
                            onClick={() => onCafeteriaMeal(m.hunger, m.cost, m.eatHours, m.label)}
                          >
                            Eat
                          </Button>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-[10px] text-gray-600">
                    Closed — the cafeteria only serves during scheduled work hours or the overtime window (Mon–Fri).
                  </p>
                )}
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-gray-700">Hours to work (default 4)</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="range"
                    min={1}
                    max={Math.max(1, maxWorkHours)}
                    value={Math.min(workHours, Math.max(1, maxWorkHours))}
                    onChange={(e) => setWorkHours(Number(e.target.value))}
                    className="flex-1 min-w-0"
                    disabled={!canWorkNow}
                    title={
                      !canWorkNow
                        ? isFirstDayOfWork
                          ? 'Come back tomorrow for your first day of work!'
                          : !isWeekday && currentJob && currentJob.workStartHour !== 0
                            ? "It's the weekend — work Mon–Fri only"
                            : 'Outside work hours — come back during your shift'
                        : 'Hours to work this shift'
                    }
                  />
                  <span className="text-sm font-bold w-8 shrink-0">
                    {Math.min(workHours, Math.max(1, maxWorkHours))}h
                  </span>
                </div>
              </div>
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
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-block">
                      <Button
                        onClick={() =>
                          onWorkShift(workIntensity, Math.min(workHours, Math.max(1, maxWorkHours)))
                        }
                        className="bg-blue-600 hover:bg-blue-700"
                        size="sm"
                        disabled={!canWorkNow}
                      >
                        Work ({Math.min(workHours, Math.max(1, maxWorkHours))} hr)
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    {canWorkNow
                      ? `${workIntensity === 'slack' ? 'Slack' : workIntensity === 'hard' ? 'Hard' : 'Normal'} — ${workIntensity === 'slack' ? 'less perf gain, less happiness loss' : workIntensity === 'hard' ? 'more perf gain, more happiness loss' : 'balanced'}. Energy ~−${(WORK_ENERGY_COST[workIntensity] * WORK_ENERGY_MULTIPLIER).toFixed(0)} / shift · higher hunger drain`
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
                    Overtime (+1 hr, tougher)
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
            {currentJob && onQuitJob && (
              <div className="rounded-lg border border-rose-200 bg-rose-50/90 px-3 py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="text-xs min-w-0">
                  <p className="font-semibold text-gray-900">Current job</p>
                  <p className="text-gray-700 truncate">
                    {getCurrentJobTitle(currentJob)} · {currentJob.name}
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-rose-800 border-rose-300 hover:bg-rose-100 shrink-0"
                    >
                      Quit job
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Quit your job?</AlertDialogTitle>
                      <AlertDialogDescription>
                        You will leave {getCurrentJobTitle(currentJob)} at {currentJob.name}. You will have no job income
                        until you accept a new offer here.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-rose-600 hover:bg-rose-700"
                        onClick={() => onQuitJob()}
                      >
                        Quit job
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
            {!jobOfficeOpen && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-950">
                The Job Office is closed — open 8:00 AM–6:00 PM daily. Pass time or come back during business hours.
              </div>
            )}
            <div className={!jobOfficeOpen ? 'pointer-events-none opacity-50' : ''}>
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
                          <p className="text-[10px] font-medium text-indigo-700/90">📍 {job.district}</p>
                          <p className="text-xs text-gray-600 line-clamp-2">{job.description}</p>
                        </div>
                      </div>
                      <div className="bg-green-50 p-2 rounded-lg mb-1.5">
                        <div className="text-sm font-bold text-green-700">
                          ${formatMoney(getSalaryPerDay(job))}/day · ${formatMoney(getSalaryPerHour(job))}/hr
                        </div>
                        <div className="text-xs text-green-600 mt-0.5">
                          ${formatMoney(getSalaryPerDay(job) * 7)}/week · ${formatMoney(getEffectiveSalary(job))}/season
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

            {selectedJob && jobOfficeOpen && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mt-3 ${gameChromePanelMuted} overflow-hidden`}
              >
                <div className={`px-3 py-2 ${gameChromePanelHeader}`}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-800">Accept job offer</p>
                  <h3 className="text-base font-bold text-slate-900 mt-0.5">{selectedJob.name}</h3>
                </div>
                <div className="px-3 py-2.5 space-y-2 border-t-[3px] border-[#1a2332] bg-[#d8e0eb]/80">
                  <p className="text-xs text-slate-700 line-clamp-3">{selectedJob.description}</p>
                  {selectedJob.allowsPartTime && (
                    <div>
                      <p className="text-[11px] font-medium text-slate-800 mb-1">Schedule</p>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => setPendingSchedule('full-time')}
                          className={`px-3 py-1.5 rounded-none border-2 text-xs font-medium transition-colors ${
                            pendingSchedule === 'full-time'
                              ? 'border-[#1a2332] bg-sky-800 text-white shadow-[2px_2px_0_0_#0f172a]'
                              : 'border-[#1a2332]/50 bg-[#f1f5f9] text-slate-800 hover:bg-[#e2e8f0]'
                          }`}
                        >
                          Full-time (40 hr)
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingSchedule('part-time')}
                          className={`px-3 py-1.5 rounded-none border-2 text-xs font-medium transition-colors ${
                            pendingSchedule === 'part-time'
                              ? 'border-[#1a2332] bg-sky-800 text-white shadow-[2px_2px_0_0_#0f172a]'
                              : 'border-[#1a2332]/50 bg-[#f1f5f9] text-slate-800 hover:bg-[#e2e8f0]'
                          }`}
                        >
                          Part-time (20 hr)
                        </button>
                      </div>
                    </div>
                  )}
                  <Button
                    onClick={handleAcceptJob}
                    className="w-full rounded-none border-[3px] border-[#1a2332] py-5 text-sm font-semibold text-white shadow-[3px_3px_0_0_#0f172a] bg-gradient-to-r from-slate-600 via-sky-600 to-cyan-500 hover:from-slate-700 hover:via-sky-700 hover:to-cyan-600 active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0_0_#0f172a]"
                  >
                    Accept job offer
                  </Button>
                </div>
              </motion.div>
            )}
          </>
        ) : (
          <div className="p-3 text-xs text-gray-500">
            {currentJob
              ? `Your workplace is in ${currentJob.district}. New job offers are at the Job Office (Marina).`
              : 'No job yet — visit the Job Office (Marina) to pick one.'}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
