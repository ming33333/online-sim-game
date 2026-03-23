import React from 'react';
import { UserRound } from 'lucide-react';

export type PortraitPresetId = 'privileged' | 'middle' | 'struggling';

const BG: Record<PortraitPresetId, string> = {
  privileged:
    'bg-gradient-to-b from-amber-100 via-yellow-50 to-amber-200 ring-2 ring-amber-300/60 shadow-md',
  middle: 'bg-gradient-to-b from-sky-100 via-blue-50 to-indigo-100 ring-2 ring-sky-300/50 shadow-md',
  struggling: 'bg-gradient-to-b from-stone-300 via-stone-200 to-stone-400 ring-2 ring-stone-400/60 shadow-inner',
};

/** Public URLs for life-path portraits (served from `/public/assets/characters/`). */
export const CHARACTER_PORTRAIT_URLS: Record<PortraitPresetId, string> = {
  privileged: '/assets/characters/character-privileged.png',
  middle: '/assets/characters/character-middle.png',
  struggling: '/assets/characters/character-struggling.png',
};

function isPresetId(id: string | null | undefined): id is PortraitPresetId {
  return id === 'privileged' || id === 'middle' || id === 'struggling';
}

export interface CharacterPortraitProps {
  presetId: string | null | undefined;
  name?: string;
  subtitle?: string;
  /** intro = taller hero; panel = sidebar during play */
  variant?: 'intro' | 'panel';
  className?: string;
}

export function CharacterPortrait({
  presetId,
  name,
  subtitle,
  variant = 'panel',
  className = '',
}: CharacterPortraitProps) {
  const resolved = isPresetId(presetId) ? presetId : null;
  const isIntro = variant === 'intro';

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
        } ${isIntro ? 'min-h-[280px] max-h-[360px] py-4' : 'min-h-[140px] max-h-[220px] py-2'}`}
      >
        {resolved ? (
          <img
            src={CHARACTER_PORTRAIT_URLS[resolved]}
            alt={alt}
            loading={isIntro ? 'eager' : 'lazy'}
            decoding="async"
            className={`w-full object-cover object-top select-none ${
              isIntro ? 'max-h-[320px] rounded-xl shadow-sm' : 'max-h-[200px] rounded-lg shadow-sm'
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
      {(name || subtitle) && (
        <div className="text-center w-full px-1">
          {name ? <p className={`font-semibold text-gray-900 ${isIntro ? 'text-lg' : 'text-sm'}`}>{name}</p> : null}
          {subtitle ? <p className="text-xs text-gray-600 mt-0.5">{subtitle}</p> : null}
        </div>
      )}
    </div>
  );
}
