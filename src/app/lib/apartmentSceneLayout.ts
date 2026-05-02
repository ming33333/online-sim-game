/** Stove on kitchen counter (right wall, left of the large fridge sprite). */
export const STOVE_APARTMENT_SCENE_CLASS =
  'pointer-events-none absolute bottom-[16%] right-[12%] z-[8] w-[26%] max-h-[20%] h-auto origin-bottom scale-[1.5] object-contain object-bottom select-none [image-rendering:pixelated]';

/** Pixel positions for known decorations on `apartment.png` (percent of scene box). */
export const DECORATION_APARTMENT_LAYOUT: Record<string, string> = {
  'decor-art':
    'pointer-events-none absolute top-[22%] left-[30%] z-[5] w-[26%] max-h-[17%] h-auto object-contain object-top select-none [image-rendering:pixelated]',
  'decor-lights':
    'pointer-events-none absolute bottom-[14%] left-[14%] z-[11] w-[11%] max-h-[30%] h-auto origin-bottom scale-[2] object-contain object-bottom select-none [image-rendering:pixelated]',
  'decor-plant':
    'pointer-events-none absolute bottom-[6%] left-[52%] z-[9] w-[13%] max-h-[22%] h-auto object-contain object-bottom select-none [image-rendering:pixelated]',
};
