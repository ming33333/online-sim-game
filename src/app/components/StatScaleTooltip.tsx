"use client";

import React from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export type StatScaleKey = "beauty" | "smarts" | "fitness" | "social";

const STAT_SCALES: Record<
  StatScaleKey,
  { label: string; entries: Array<{ value: number; meaning: string }> }
> = {
  beauty: {
    label: "Beauty",
    entries: [
      { value: 0, meaning: "Ugly" },
      { value: 1, meaning: "Hard to look at" },
      { value: 2, meaning: "Plain" },
      { value: 3, meaning: "Bland" },
      { value: 4, meaning: "Below average" },
      { value: 5, meaning: "Average" },
      { value: 6, meaning: "Cute" },
      { value: 7, meaning: "Good looking" },
      { value: 8, meaning: "Gorgeous" },
      { value: 9, meaning: "Beautiful" },
      { value: 10, meaning: "Stunning" },
    ],
  },
  smarts: {
    label: "Smarts",
    entries: [
      { value: 0, meaning: "Clueless" },
      { value: 1, meaning: "Very slow" },
      { value: 2, meaning: "Slow" },
      { value: 3, meaning: "Below average" },
      { value: 4, meaning: "Decent" },
      { value: 5, meaning: "Average" },
      { value: 6, meaning: "Bright" },
      { value: 7, meaning: "Smart" },
      { value: 8, meaning: "Very smart" },
      { value: 9, meaning: "Genius" },
      { value: 10, meaning: "Super genius" },
    ],
  },
  fitness: {
    label: "Fitness",
    entries: [
      { value: 0, meaning: "Frail" },
      { value: 1, meaning: "Very weak" },
      { value: 2, meaning: "Weak" },
      { value: 3, meaning: "Out of shape" },
      { value: 4, meaning: "Below average" },
      { value: 5, meaning: "Average" },
      { value: 6, meaning: "Fit" },
      { value: 7, meaning: "Athletic" },
      { value: 8, meaning: "Very athletic" },
      { value: 9, meaning: "Elite" },
      { value: 10, meaning: "Peak human" },
    ],
  },
  social: {
    label: "Social",
    entries: [
      { value: 0, meaning: "Very awkward" },
      { value: 1, meaning: "Shy" },
      { value: 2, meaning: "Reserved" },
      { value: 3, meaning: "Quiet" },
      { value: 4, meaning: "Below average" },
      { value: 5, meaning: "Average" },
      { value: 6, meaning: "Friendly" },
      { value: 7, meaning: "Charming" },
      { value: 8, meaning: "Popular" },
      { value: 9, meaning: "Influencer" },
      { value: 10, meaning: "Social butterfly" },
    ],
  },
};

export function StatScaleTooltip({
  stat,
  children,
  side = "top",
  align = "center",
  delayDuration = 150,
  className,
}: {
  stat: StatScaleKey;
  children: React.ReactElement;
  side?: React.ComponentProps<typeof TooltipContent>["side"];
  align?: React.ComponentProps<typeof TooltipContent>["align"];
  delayDuration?: number;
  className?: string;
}) {
  const cfg = STAT_SCALES[stat];

  return (
    <Tooltip delayDuration={delayDuration}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent
        side={side}
        align={align}
        className={
          "max-w-[min(20rem,92vw)] text-left !rounded-md " +
          "!bg-[#eef2f8] !text-slate-900 shadow-[4px_4px_0_0_rgba(15,23,42,0.22)] " +
          "!border-[3px] !border-[#1a2332] px-3 py-2.5 " +
          "[&>svg]:fill-[#eef2f8] [&>svg]:stroke-[#1a2332] " +
          (className ?? "")
        }
      >
        <div className="font-pixel-title text-[0.6rem] uppercase tracking-wide mb-2">
          {cfg.label} scale (0–10)
        </div>
        <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[11px] leading-snug">
          {cfg.entries.map((e) => (
            <React.Fragment key={e.value}>
              <div className="font-semibold tabular-nums">{e.value}</div>
              <div className="text-slate-800">{e.meaning}</div>
            </React.Fragment>
          ))}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

