/**
 * Silver / steel / blue-gray chrome — matches intro menu (LifeSimGame intro card).
 * Use for main play shell, map card, stats hub, and side panels.
 */

/** Primary panel: map card, stats hub */
export const gameChromePanel =
  'rounded-none border-[3px] border-[#1a2332] bg-[#d8e0eb] text-slate-900 shadow-[4px_4px_0_0_rgba(15,23,42,0.28)]';

/** Section header strip inside a chrome panel */
export const gameChromePanelHeader =
  'border-b-[3px] border-[#1a2332] bg-[linear-gradient(180deg,#b9c6d8_0%,#a8b6cc_100%)]';

/**
 * Main play column phase cards: title strip stays visible while the body scrolls
 * (PhaseScrollRoot / tall location UIs — e.g. Choose Your Degree, Live With Parents, Job Office).
 */
export const gameChromePhaseCardHeader = `${gameChromePanelHeader} sticky top-0 z-30 shadow-[0_1px_0_rgba(15,23,42,0.12)]`;

/** Secondary panel: character strip, event log */
export const gameChromePanelMuted =
  'rounded-none border-[3px] border-[#1a2332] bg-[#e6ecf4] text-slate-900 shadow-[3px_3px_0_0_rgba(15,23,42,0.22)]';

/** Map playfield background (inside chrome card — no extra border; card already frames) */
export const gameChromeMapCanvas =
  'bg-gradient-to-br from-slate-400/90 via-sky-200/85 to-slate-500/80 ring-1 ring-[#1a2332]/50 rounded-none';
