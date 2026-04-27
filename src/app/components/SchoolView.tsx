import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GraduationCap, Users } from 'lucide-react';
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
import { fmt2, formatMoney } from '../lib/formatNumber';
import { gameChromePanel, gameChromePhaseCardHeader } from '../lib/gameChrome';
import {
  relationshipStageLabel,
  SCHOOL_LOUNGE_NPC_IDS,
  npcById,
  type NpcId,
} from '../lib/relationships';
import { useStoryBeatTyping, storyBeatDialogContentClassName } from '../lib/useStoryBeatTyping';
import { cn } from './ui/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

type EducationLevel = 'none' | 'in-progress' | 'completed';
type StudyIntensity = 'slack' | 'normal' | 'focus';

interface SchoolViewProps {
  educationLevel: EducationLevel;
  educationDegree: Degree | null;
  educationProgress: number;
  currentMoney: number;
  currentRent: number;
  dayOfYear: number;
  schoolCampusOpen: boolean;
  schoolCampusClosedReason: string;
  /** True when tuition for the current 28-day season is paid (required to study). */
  tuitionPaidCurrentSeason: boolean;
  onStartDegree: (degree: Degree) => boolean;
  onStudy: (intensity: StudyIntensity, hours: number) => void;
  onOpenMapOverlay: () => void;
  onChillAtSchool: (hours: number) => void;
  onPublicNapAtSchool: (hours: number) => void;
  onEatSchoolCafe: (name: string, hungerGain: number, cost: number, healthPenalty: number) => void;
  npcInteractions: Record<NpcId, number>;
  datingPartnerId: NpcId | null;
  onTalkToNpc: (id: NpcId) => void;
  onStartDating: (id: NpcId) => void;
  schoolTutorialOpen: boolean;
  onDismissSchoolTutorial: () => void;
  schoolMeetClassmatesOpen: boolean;
  onDismissSchoolMeetClassmates: () => void;
  degreeCareerInfo: Partial<Record<Degree, Array<{ jobName: string; tiers: string[] }>>>;
}

const DEGREE_DAYS_NORMAL = 80;
const STUDY_HOURS_PER_DAY = 8; // 8 hours = same effects as old "study day"
const TUITION_PER_YEAR = 4000;

type SchoolMeetBeat = {
  /** What just happened before they speak (shown above the dialogue box). */
  scene: string;
  npcId: 'school-avery' | 'school-morgan' | 'school-devon' | 'school-elia';
  line: string;
  portraitFrom: string;
  portraitTo: string;
};

/** First visit: small story beats + one line each, order = path through campus. */
const CAMPUS_MEET_BEATS: SchoolMeetBeat[] = [
  {
    scene:
      'You step onto campus for the first time. Signs point everywhere at once, your map app is useless, and you are very obviously lost. Someone walking past slows down when they see your face.',
    npcId: 'school-avery',
    line: "Hey… I'm Avery Kim. I think we're in the same lecture block, right? If you ever need notes, I've got way too many—just ask.",
    portraitFrom: '#7c3a5a',
    portraitTo: '#4a2040',
  },
  {
    scene:
      'You take a wrong turn following a shortcut. The smell of coffee drags you into the student cafeteria instead of the admin building. Someone at a corner table notices you spinning in place.',
    npcId: 'school-morgan',
    line: "Morgan Patel. You're looking for Admissions, yeah? Go back out, take the covered walk on the left—Old Main, second floor, can't miss the big banner. You've got this.",
    portraitFrom: '#5b4a8c',
    portraitTo: '#352860',
  },
  {
    scene:
      'You hurry down the hallway Morgan described, counting door plaques. You round a corner too fast and nearly collide with someone juggling a laptop, books, and an energy drink.',
    npcId: 'school-devon',
    line: "Whoa—Devon Okonkwo. STEM labs survivor. You okay? Admissions is literally the next corner; I'll walk you to the junction if you want.",
    portraitFrom: '#2d6a4f',
    portraitTo: '#14452f',
  },
  {
    scene:
      'The admissions office door finally matches the campus map. Inside, fluorescent light and stacks of forms. Someone at the counter looks up from a clipboard and actually smiles.',
    npcId: 'school-elia',
    line: "Elia Vasquez. First-day paperwork? Same. I sketch in the margins when I'm nervous—don't tell them. Anyway, hi. I'll save you a spot in the café line sometime.",
    portraitFrom: '#b45309',
    portraitTo: '#7c2d12',
  },
];

export function SchoolView({
  educationLevel,
  educationDegree,
  educationProgress,
  currentMoney,
  currentRent,
  dayOfYear,
  schoolCampusOpen,
  schoolCampusClosedReason,
  tuitionPaidCurrentSeason,
  onStartDegree,
  onStudy,
  onOpenMapOverlay,
  onChillAtSchool,
  onPublicNapAtSchool,
  onEatSchoolCafe,
  npcInteractions,
  datingPartnerId,
  onTalkToNpc,
  onStartDating,
  schoolTutorialOpen,
  onDismissSchoolTutorial,
  schoolMeetClassmatesOpen,
  onDismissSchoolMeetClassmates,
  degreeCareerInfo,
}: SchoolViewProps) {
  /** Slightly darker than default dialog scrim — matches other full-screen game layers. */
  const gameEventOverlayClass = 'bg-slate-950/60 backdrop-blur-[2px]';

  const degrees: { id: Degree; label: string; description: string;}[] = [
    {
      id: 'accounting',
      label: 'Accounting',
      description: 'Learn bookkeeping, tax, and financial reporting.',
    },
    {
      id: 'engineering',
      label: 'Engineering',
      description: 'Study math, physics, and building complex systems.',
    },
    {
      id: 'doctor',
      label: 'Doctor (Med School)',
      description: 'Long, intense medical training to become a doctor.',
    },
    {
      id: 'finance',
      label: 'Finance',
      description: 'Dive into markets, investing, and corporate finance.',
    },
  ];

  const hasActiveDegree =
    educationLevel === 'in-progress' && educationDegree !== null;

  const [hours, setHours] = useState(4);
  const [loungeChillHours, setLoungeChillHours] = useState(1);
  const [loungeNapHours, setLoungeNapHours] = useState(1);

  const [degreeToEnroll, setDegreeToEnroll] = useState<Degree | null>(null);
  /** 0 = story for beat 0, 1 = dialogue for beat 0, 2 = story for beat 1, … */
  const [campusMeetSubStep, setCampusMeetSubStep] = useState(0);

  useEffect(() => {
    if (schoolMeetClassmatesOpen) setCampusMeetSubStep(0);
  }, [schoolMeetClassmatesOpen]);

  const campusMeetSubStepsTotal = CAMPUS_MEET_BEATS.length * 2;
  const meetBeatIndex = Math.floor(campusMeetSubStep / 2);
  const meetBeatPhase: 'story' | 'dialogue' = campusMeetSubStep % 2 === 0 ? 'story' : 'dialogue';
  const meetBeat = CAMPUS_MEET_BEATS[meetBeatIndex] ?? CAMPUS_MEET_BEATS[0];
  const classmateIntroId = meetBeat.npcId;
  const classmateIntroProfile = npcById(classmateIntroId);
  const portraitInitial =
    classmateIntroProfile?.name?.trim().charAt(0).toUpperCase() ?? '?';
  const isLastCampusMeetStep = campusMeetSubStep >= campusMeetSubStepsTotal - 1;

  const campusMeetFullText = meetBeatPhase === 'story' ? meetBeat.scene : meetBeat.line;
  const campusBeatTyping = useStoryBeatTyping(campusMeetFullText, campusMeetSubStep);

  const TUITION_PER_SEASON = TUITION_PER_YEAR / 4;
  const SEASON_END_DAYS = [28, 56, 84, 112];
  const seasonEnd = SEASON_END_DAYS.find((d) => d >= dayOfYear) ?? 112;
  const daysLeftInSeason = seasonEnd - dayOfYear + 1;
  const isProrated = daysLeftInSeason < 28;
  const tuitionForSeason = isProrated
    ? Math.round((daysLeftInSeason / 28) * TUITION_PER_SEASON)
    : TUITION_PER_SEASON;

  return (
    <>
      <Dialog
        open={schoolTutorialOpen}
        onOpenChange={(open) => {
          if (!open) onDismissSchoolTutorial();
        }}
      >
        <DialogContent
          overlayClassName={gameEventOverlayClass}
          className="sm:max-w-lg max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden border-slate-800/20 bg-slate-50 shadow-xl"
        >
          <DialogHeader className="px-4 pt-4 pb-2 pr-12 space-y-1">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <GraduationCap className="size-5 text-violet-600 shrink-0" aria-hidden />
              Welcome to campus
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 text-left">
              Quick guide to majors, enrollment timing, and graduating.
            </DialogDescription>
          </DialogHeader>
          <div className="px-4 text-xs text-slate-800 space-y-4 max-h-[min(58vh,480px)] overflow-y-auto overscroll-y-contain border-y border-slate-200/80 py-3 bg-slate-50/50">
            <section>
              <h3 className="font-semibold text-slate-900 mb-1.5">Majors and jobs</h3>
              <p className="text-slate-600 mb-2">
                Each degree unlocks a professional career track at the Job Office. Examples:
              </p>
              <ul className="list-disc pl-4 space-y-1.5 text-slate-700">
                <li>
                  <span className="font-medium text-slate-900">Accounting</span> — Junior Accountant and accounting
                  promotions (toward CFO).
                </li>
                <li>
                  <span className="font-medium text-slate-900">Engineering</span> — Software Engineer and tech promotions
                  (toward CTO).
                </li>
                <li>
                  <span className="font-medium text-slate-900">Doctor</span> — Resident Doctor and clinical promotions after
                  med school.
                </li>
                <li>
                  <span className="font-medium text-slate-900">Finance</span> — Financial Analyst and finance leadership
                  track.
                </li>
              </ul>
            </section>
            <section>
              <h3 className="font-semibold text-slate-900 mb-1.5">When you can sign up</h3>
              <p className="text-slate-700 leading-relaxed">
                You can <strong>start a new degree</strong> only during the <strong>first two weeks</strong> (days{' '}
                <strong>1–14</strong>) of each <strong>28-day season</strong>. After day 14, enrollment is closed until{' '}
                <strong>day 1 of the next season</strong>. The lounge, café, and studying use the same window—when campus
                is closed, come back next season.
              </p>
            </section>
            <section>
              <h3 className="font-semibold text-slate-900 mb-1.5">Tuition</h3>
              <p className="text-slate-700 leading-relaxed">
                Pay <strong>tuition on your phone</strong> each season before you can study. Enrolling may charge this
                season&apos;s tuition if you haven&apos;t paid yet.
              </p>
            </section>
            <section>
              <h3 className="font-semibold text-slate-900 mb-1.5">Graduating</h3>
              <p className="text-slate-700 leading-relaxed">
                Use <strong>study sessions</strong> to fill your degree <strong>progress bar</strong>. When it reaches{' '}
                <strong>100%</strong>, you <strong>complete the degree</strong>, earn the diploma, and the related jobs
                unlock at the Job Office.
              </p>
            </section>
          </div>
          <DialogFooter className="px-4 py-3 sm:justify-center">
            <Button type="button" className="w-full sm:w-auto min-w-[8rem]" onClick={onDismissSchoolTutorial}>
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={schoolMeetClassmatesOpen}
        onOpenChange={(open) => {
          if (!open) onDismissSchoolMeetClassmates();
        }}
      >
        <DialogContent overlayClassName={gameEventOverlayClass} className={storyBeatDialogContentClassName}>
          <DialogHeader className="sr-only">
            <DialogTitle>Campus introductions</DialogTitle>
            <DialogDescription>
              Step {campusMeetSubStep + 1} of {campusMeetSubStepsTotal}. Meet classmates you can talk to in the lounge.
            </DialogDescription>
          </DialogHeader>
          <div
            className="mx-1 flex min-h-0 flex-1 flex-col sm:mx-2"
            style={{ imageRendering: 'pixelated' }}
          >
            <div className="flex min-h-0 flex-1 flex-col rounded-sm border-4 border-[#5c3d2e] bg-[#2d1f14] p-2 shadow-[0_0_0_2px_#1a120c,8px_8px_0_0_rgba(0,0,0,0.45)] sm:p-3">
              <div className="mb-2 flex shrink-0 items-center justify-between gap-2 pr-6">
                <p className="font-pixel-title text-[0.45rem] sm:text-[0.5rem] uppercase tracking-widest text-[#e8dcc8]">
                  <Users className="inline size-3 mr-1.5 align-middle opacity-90" aria-hidden />
                  First day
                </p>
                <span className="font-pixel-ui text-xs text-[#c9a87a] tabular-nums text-right leading-tight">
                  <span className="block">
                    {campusMeetSubStep + 1} / {campusMeetSubStepsTotal}
                  </span>
                  <span className="block opacity-80 normal-case">
                    {meetBeatPhase === 'story' ? 'Story' : 'They speak'}
                  </span>
                </span>
              </div>
              <div key={campusMeetSubStep} className="min-h-0 flex-1 overflow-hidden">
                {meetBeatPhase === 'story' ? (
                  <div
                    className="flex h-[200px] cursor-pointer flex-col rounded-sm border-4 border-[#4a3020] bg-[#e8dcc8] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] sm:h-[220px] sm:px-4"
                    onClick={campusBeatTyping.skipTyping}
                    role="presentation"
                  >
                    <p className="font-pixel-title mb-1.5 shrink-0 text-[0.5rem] uppercase tracking-wider text-[#6b4423]">
                      What happens
                    </p>
                    <p
                      className="font-pixel-ui min-h-0 flex-1 overflow-y-auto text-base leading-snug text-[#3d2914] sm:text-lg sm:leading-snug"
                      aria-live="polite"
                    >
                      {campusBeatTyping.displayed}
                      {campusBeatTyping.showCaret ? (
                        <span
                          className="ml-0.5 inline-block h-[1.05em] w-[3px] [vertical-align:-0.12em] bg-[#3d2914] motion-safe:animate-pulse"
                          aria-hidden
                        />
                      ) : null}
                    </p>
                  </div>
                ) : (
                  <div
                    className="flex h-[200px] w-full cursor-pointer flex-row border-4 border-[#4a3020] bg-[#3d2914] shadow-[inset_0_2px_0_rgba(255,255,255,0.08)] sm:h-[220px]"
                    onClick={campusBeatTyping.skipTyping}
                    role="region"
                    aria-label={`${classmateIntroProfile?.name ?? 'Classmate'} is speaking`}
                  >
                    <div className="flex min-h-0 min-w-0 flex-1 flex-col border-r-4 border-[#4a3020] bg-[#fce3b4] p-2 sm:p-3">
                      <p
                        className="font-pixel-ui min-h-0 flex-1 overflow-y-auto text-base leading-relaxed text-[#3d2914] sm:text-lg"
                        aria-live="polite"
                      >
                        {campusBeatTyping.displayed}
                        {campusBeatTyping.showCaret ? (
                          <span
                            className="ml-0.5 inline-block h-[1.05em] w-[3px] [vertical-align:-0.12em] bg-[#3d2914] motion-safe:animate-pulse"
                            aria-hidden
                          />
                        ) : null}
                      </p>
                    </div>
                    <div className="flex w-[100px] shrink-0 flex-col justify-between bg-gradient-to-b from-[#6b4423] to-[#4a3020] p-1.5 sm:w-[38%] sm:max-w-[180px] sm:p-2">
                      <div
                        className="mx-auto aspect-square w-full max-w-[120px] border-[3px] border-[#c9a227] shadow-[inset_0_0_0_2px_rgba(0,0,0,0.25),0_2px_0_#2d1f14] flex items-center justify-center"
                        style={{
                          background: `linear-gradient(145deg, ${meetBeat.portraitFrom}, ${meetBeat.portraitTo})`,
                        }}
                      >
                        <span className="font-pixel-title text-2xl text-[#fce3b4] drop-shadow-[2px_2px_0_#1a120c] sm:text-3xl">
                          {portraitInitial}
                        </span>
                      </div>
                      <div className="mt-1.5 flex justify-center sm:mt-2">
                        <div className="w-full rounded-full border-2 border-[#5c3d2e] bg-[#fce3b4] px-1.5 py-1 text-center shadow-[0_2px_0_#2d1f14]">
                          <span className="font-pixel-title text-[0.45rem] uppercase tracking-wide text-[#2d1f14] leading-tight line-clamp-2 sm:text-[0.5rem]">
                            {classmateIntroProfile?.name ?? 'Classmate'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="mx-1 mt-2 flex h-12 shrink-0 flex-row items-center justify-end gap-2 border-0 bg-transparent px-0 pb-2 sm:mx-2">
            {!isLastCampusMeetStep ? (
              <Button
                type="button"
                disabled={!campusBeatTyping.typingDone}
                className={cn(
                  'h-11 w-40 shrink-0 rounded-none border-[3px] border-[#4a3020] bg-gradient-to-b from-[#8b5a3c] to-[#5c3d2e] font-pixel-title text-[0.55rem] sm:text-[0.6rem] uppercase tracking-wide text-[#fce3b4] shadow-[4px_4px_0_#1a120c] hover:from-[#9d6a4a] hover:to-[#6b4423] disabled:opacity-100',
                  !campusBeatTyping.typingDone && 'pointer-events-none invisible'
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  setCampusMeetSubStep((s) => Math.min(s + 1, campusMeetSubStepsTotal - 1));
                }}
              >
                Next
              </Button>
            ) : (
              <Button
                type="button"
                disabled={!campusBeatTyping.typingDone}
                className={cn(
                  'h-11 w-40 shrink-0 rounded-none border-[3px] border-[#1a2332] bg-gradient-to-r from-slate-600 via-sky-600 to-cyan-500 font-pixel-title text-[0.55rem] sm:text-[0.6rem] uppercase tracking-wide text-white shadow-[4px_4px_0_#0f172a] disabled:opacity-100',
                  !campusBeatTyping.typingDone && 'pointer-events-none invisible'
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  onDismissSchoolMeetClassmates();
                }}
              >
                Continue
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

    <Card className={`${gameChromePanel} w-full min-h-full flex flex-col`}>
      <CardHeader
        className={`flex flex-shrink-0 items-center justify-between gap-4 px-3 py-3 sm:px-4 ${gameChromePhaseCardHeader}`}
      >
        <div className="min-w-0">
          <CardTitle className="text-lg sm:text-xl text-slate-900">
            <Tooltip delayDuration={150}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline-flex cursor-help items-center gap-2 rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50"
                  aria-label="Choose your degree — enrollment and tuition rules"
                >
                  <span className="border-b border-dotted border-slate-500/80">Choose Your Degree</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-sm text-left">
                Pick a major during the first 14 days of each season; after that, wait for the next season to enroll. Pay
                tuition on your phone each season to study. When your progress hits 100%, you earn the degree and unlock
                matching careers.
              </TooltipContent>
            </Tooltip>
          </CardTitle>
        </div>
        <Button variant="outline" size="sm" onClick={onOpenMapOverlay} className="shrink-0">
          Map
        </Button>
      </CardHeader>
      <CardContent className="space-y-6 px-3 sm:px-4 pb-4 pt-2">
        {schoolCampusOpen && (
          <div className="rounded-lg border border-sky-200 bg-sky-50/80 p-4 space-y-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">Campus Café</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-800 mb-1">Chill in the lounge (hours)</p>
              <div className="flex gap-2 items-center">
                <input
                  type="range"
                  min={1}
                  max={8}
                  value={loungeChillHours}
                  onChange={(e) => setLoungeChillHours(Number(e.target.value))}
                  className="flex-1"
                />
                <span className="text-sm font-bold w-8">{loungeChillHours}h</span>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-2 bg-white hover:bg-slate-200"
                onClick={() => onChillAtSchool(loungeChillHours)}
              >
                Chill
              </Button>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-800 mb-1">Public nap (hours)</p>
              <div className="flex gap-2 items-center">
                <input
                  type="range"
                  min={1}
                  max={8}
                  value={loungeNapHours}
                  onChange={(e) => setLoungeNapHours(Number(e.target.value))}
                  className="flex-1"
                />
                <span className="text-sm font-bold w-8">{loungeNapHours}h</span>
              </div>
              <Button type="button" size="sm" variant="outline" className="mt-2" onClick={() => onPublicNapAtSchool(loungeNapHours)}>
                Nap
              </Button>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-800 mb-1.5">Café (eat now)</p>
              <div className="space-y-2">
                {[
                  { name: 'Burger combo', hungerGain: 25, cost: 22.5, healthPenalty: 2 },
                  { name: 'Fried chicken box', hungerGain: 35, cost: 32.5, healthPenalty: 3 },
                ].map((opt) => (
                  <div
                    key={opt.name}
                    className="flex items-center justify-between p-2 rounded-lg border border-emerald-200 bg-white/90 text-xs"
                  >
                    <div>
                      <span className="font-semibold">{opt.name}</span>
                      <span className="text-gray-600 block text-[10px]">
                        +{opt.hungerGain} hunger · health −{opt.healthPenalty}
                      </span>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="h-7 text-[11px]"
                      disabled={currentMoney < opt.cost}
                      onClick={() => onEatSchoolCafe(opt.name, opt.hungerGain, opt.cost, opt.healthPenalty)}
                    >
                      ${formatMoney(opt.cost)}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {schoolCampusOpen && (
          <div className="rounded-lg border border-violet-200 bg-violet-50/80 p-4 space-y-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">Classmates</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SCHOOL_LOUNGE_NPC_IDS.map((npcId) => {
                const p = npcById(npcId);
                if (!p) return null;
                const count = npcInteractions[npcId] ?? 0;
                return (
                  <div
                    key={npcId}
                    className="rounded-lg border border-violet-200/90 bg-white/90 p-3 space-y-2 shadow-sm"
                  >
                    <p className="text-xs font-semibold text-gray-900">{p.name}</p>
                    <p className="text-[11px] text-violet-950">
                      {relationshipStageLabel(count, datingPartnerId === npcId)}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" size="sm" variant="secondary" onClick={() => onTalkToNpc(npcId)}>
                        Talk
                      </Button>
                      {count >= 50 && datingPartnerId !== npcId && (
                        <Button
                          type="button"
                          size="sm"
                          className="bg-rose-600 hover:bg-rose-700"
                          disabled={datingPartnerId != null}
                          onClick={() => onStartDating(npcId)}
                        >
                          Ask out
                        </Button>
                      )}
                    </div>
                    {datingPartnerId != null && datingPartnerId !== npcId && count >= 50 && (
                      <p className="text-[10px] text-amber-800">
                        Ask out unavailable while you&apos;re dating someone else.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {degrees.map((degree) => {
            const isCompleted =
              educationLevel === 'completed' && educationDegree === degree.id;
            const isActive =
              educationLevel === 'in-progress' && educationDegree === degree.id;

            return (
              <Tooltip delayDuration={150}>
                <TooltipTrigger asChild>
                  <motion.div
                    key={degree.id}
                    whileHover={{ scale: isCompleted ? 1 : 1.02 }}
                    whileTap={{ scale: isCompleted ? 1 : 0.98 }}
                    className={`border-2 p-5 rounded-lg bg-white transition-all ${
                      isCompleted
                        ? 'border-green-400 bg-green-50 cursor-default'
                        : isActive
                          ? 'border-purple-400 bg-purple-50 cursor-default'
                          : !schoolCampusOpen
                            ? 'border-gray-200 opacity-60 cursor-not-allowed'
                            : 'border-gray-200 hover:border-purple-400 hover:shadow-xl cursor-pointer'
                    }`}
                    onClick={() => {
                      if (!isCompleted && !hasActiveDegree && schoolCampusOpen) {
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
                {!isCompleted && !isActive && !hasActiveDegree && !schoolCampusOpen && (
                  <p className="text-xs text-amber-800 mt-2">{schoolCampusClosedReason}</p>
                )}
                  </motion.div>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  className={
                    'max-w-sm text-left !rounded-md ' +
                    '!bg-[#eef2f8] !text-slate-900 shadow-[4px_4px_0_0_rgba(15,23,42,0.22)] ' +
                    '!border-[3px] !border-[#1a2332] px-3 py-2.5 ' +
                    '[&>svg]:fill-[#eef2f8] [&>svg]:stroke-[#1a2332]'
                  }
                >
                  <div className="text-xs font-semibold mb-1 text-slate-900">Careers & levels</div>
                  {(degreeCareerInfo?.[degree.id] ?? []).length > 0 ? (
                    <div className="space-y-2 text-xs">
                      {(degreeCareerInfo?.[degree.id] ?? []).map((job) => (
                        <div key={job.jobName}>
                          <div className="font-semibold text-slate-900">{job.jobName}</div>
                          <div className="mt-1 space-y-0.5">
                            {job.tiers.map((tier, idx) => (
                              <div key={tier} className="text-[11px] leading-snug text-slate-800">
                                <span className="font-semibold tabular-nums">Level {idx + 1}:</span> {tier}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-700">Career info unavailable.</div>
                  )}
                </TooltipContent>
              </Tooltip>
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
                    {tuitionPaidCurrentSeason ? (
                      <>
                        {' '}
                        Tuition for this season is already paid — no charge to enroll.
                      </>
                    ) : (
                      <>
                        {' '}
                        Tuition for this season{isProrated ? ` (prorated, ${daysLeftInSeason} days left)` : ''} is{' '}
                        <strong>${tuitionForSeason.toLocaleString()}</strong>. You need that amount now; you cannot start
                        without paying. Each new season, pay tuition on your phone before studying.
                      </>
                    )}
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDegreeToEnroll(null)}>
                Cancel
              </Button>
              <Button
                disabled={!tuitionPaidCurrentSeason && currentMoney < tuitionForSeason}
                title={
                  !tuitionPaidCurrentSeason && currentMoney < tuitionForSeason
                    ? `Need $${tuitionForSeason.toLocaleString()} to pay tuition (you have $${formatMoney(currentMoney)})`
                    : undefined
                }
                onClick={() => {
                  if (degreeToEnroll) {
                    const ok = onStartDegree(degreeToEnroll);
                    if (ok) setDegreeToEnroll(null);
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
            {!schoolCampusOpen && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-950">
                {schoolCampusClosedReason}
              </div>
            )}
            {!tuitionPaidCurrentSeason && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900">
                Pay tuition for this season on your phone before you can study. Every season requires payment.
              </div>
            )}
            <div className="flex items-center justify-between">
              <div>
                <Tooltip delayDuration={150}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="text-sm font-semibold inline-flex items-center gap-1 cursor-help rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50"
                      aria-label="Current degree — study tips"
                    >
                      <span className="border-b border-dotted border-slate-500/80">Current degree</span>
                      <span>:</span>
                      <span>
                        {educationDegree.charAt(0).toUpperCase()}
                        {educationDegree.slice(1)}
                      </span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-sm text-left">
                    Choose study hours and effort level. 8 hours = 1 day&apos;s progress toward 100% (then you graduate).
                    No extra cost per study session once tuition is paid for the season.
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="w-40">
                <Progress value={educationProgress} className="h-2" />
                <p className="text-xs text-right text-gray-600 mt-1">
                  {fmt2(educationProgress)}%
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-500">
              Enrolled students can move to University District Housing (Housing Office) for a lower student rate ($50/week, listed $200 per 28-day season).
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
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Tooltip delayDuration={150}>
                <TooltipTrigger asChild>
                  <span tabIndex={0} className="inline-flex">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!schoolCampusOpen || !tuitionPaidCurrentSeason}
                      onClick={() => onStudy('slack', hours)}
                    >
                      Slack
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs text-left">
                  Slack: slower progress, keeps happiness higher.
                </TooltipContent>
              </Tooltip>

              <Tooltip delayDuration={150}>
                <TooltipTrigger asChild>
                  <span tabIndex={0} className="inline-flex">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!schoolCampusOpen || !tuitionPaidCurrentSeason}
                      onClick={() => onStudy('normal', hours)}
                    >
                      Normal
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs text-left">
                  Normal: balanced progress, moderate stress.
                </TooltipContent>
              </Tooltip>

              <Tooltip delayDuration={150}>
                <TooltipTrigger asChild>
                  <span tabIndex={0} className="inline-flex">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!schoolCampusOpen || !tuitionPaidCurrentSeason}
                      onClick={() => onStudy('focus', hours)}
                    >
                      Focused
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs text-left">
                  Focused: fastest progress, more stress, more smarts gain.
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
    </>
  );
}

