import React from 'react';
import { UserRound } from 'lucide-react';

export type PortraitPresetId = 'privileged' | 'middle' | 'struggling';
export type CharacterGender = 'boy' | 'girl';

const BG: Record<PortraitPresetId, string> = {
  privileged:
    'bg-gradient-to-b from-amber-100 via-yellow-50 to-amber-200 ring-2 ring-amber-300/60 shadow-md',
  middle: 'bg-gradient-to-b from-sky-100 via-blue-50 to-indigo-100 ring-2 ring-sky-300/50 shadow-md',
  struggling: 'bg-gradient-to-b from-stone-300 via-stone-200 to-stone-400 ring-2 ring-stone-400/60 shadow-inner',
};

const PRESET_TO_ASSET: Record<PortraitPresetId, 'rich' | 'normal' | 'poor'> = {
  privileged: 'rich',
  middle: 'normal',
  struggling: 'poor',
};

/**
 * Life-path portraits (PixelLab exports under `public/assets/characters/`).
 * Each life path maps to rich / normal / poor; gender picks boy vs girl sprites.
 */
export function getCharacterPortraitUrl(
  presetId: PortraitPresetId,
  gender: CharacterGender,
  rotation: 'south' | 'south-east' = 'south'
): string {
  const tier = PRESET_TO_ASSET[presetId];
  const rot = rotation === 'south-east' ? 'south-east' : 'south';
  return `/assets/characters/${tier}_${gender}_from_the_city/rotations/${rot}.png`;
}

/** @deprecated Use getCharacterPortraitUrl — kept for quick lookups without gender */
export const CHARACTER_PORTRAIT_URLS: Record<PortraitPresetId, string> = {
  privileged: getCharacterPortraitUrl('privileged', 'boy'),
  middle: getCharacterPortraitUrl('middle', 'girl'),
  struggling: getCharacterPortraitUrl('struggling', 'boy', 'south'),
};

function isPresetId(id: string | null | undefined): id is PortraitPresetId {
  return id === 'privileged' || id === 'middle' || id === 'struggling';
}

export interface CharacterPortraitProps {
  presetId: string | null | undefined;
  /** Defaults to girl to match prior middle-path preview */
  gender?: CharacterGender;
  name?: string;
  subtitle?: string;
  /** intro = taller hero; panel = sidebar during play */
  variant?: 'intro' | 'panel';
  className?: string;
}

export function CharacterPortrait({
  presetId,
  gender = 'girl',
  name,
  subtitle,
  variant = 'panel',
  className = '',
}: CharacterPortraitProps) {
  const resolved = isPresetId(presetId) ? presetId : null;
  const isIntro = variant === 'intro';

  const rotation: 'south' | 'south-east' = 'south';
  const src = resolved ? getCharacterPortraitUrl(resolved, gender, rotation) : null;

  const alt =
    resolved && name
      ? `${name}, ${subtitle ?? resolved} life path portrait`
      : resolved
        ? `Character portrait, ${resolved} life path`
        : 'Character preview placeholder';

  return (
    <div className={`flex flex-col items-center justify-center gap-2 ${className}`}>
      <div
        className={`relative rounded-2xl overflow-hidden flex items-center justify-center w-full ${
          resolved ? BG[resolved] : 'bg-gradient-to-b from-gray-100 to-gray-200 ring-2 ring-dashed ring-gray-300'
        } ${isIntro ? 'min-h-[336px] max-h-[432px] py-4' : 'min-h-[360px] max-h-[480px] py-4'}`}
      >
        {src ? (
          <img
            src={src}
            alt={alt}
            loading={isIntro ? 'eager' : 'lazy'}
            decoding="async"
            className={`w-full select-none object-contain object-center [image-rendering:pixelated] ${
              isIntro
                ? 'max-h-[408px] rounded-xl shadow-sm'
                : 'max-h-[440px] w-auto scale-[1.55] md:scale-[1.75] rounded-lg shadow-sm'
            }`}
          />
        ) : (
          <div
            className="flex flex-col items-center gap-3 text-gray-500 py-8"
            role="status"
            aria-label="Character preview: choose a life path to see your character"
          >
            <UserRound className="size-16 opacity-40" strokeWidth={1.25} aria-hidden />
            <p className="text-sm font-medium px-4 text-center">Pick a starting life path to preview</p>
          </div>
        )}
      </div>
    </div>
  );
}
