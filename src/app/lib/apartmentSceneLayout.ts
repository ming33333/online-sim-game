/** Native pixel size of `public/assets/buildings/apartment.png` (wide room interior). */
export const APARTMENT_SCENE_WIDTH = 216;
export const APARTMENT_SCENE_HEIGHT = 118;

/** Fills remaining home column height; image scales to fit without clipping. */
export const APARTMENT_SCENE_OUTER_CLASS = 'flex min-h-0 flex-1 w-full min-w-0';

/** Fills the home column; furniture overlays use % of this box. */
export const APARTMENT_SCENE_SLOT_CLASS =
  'relative min-h-0 w-full flex-1 overflow-hidden border-[3px] border-[#1a2332] bg-[#3d3428] shadow-[3px_3px_0_0_rgba(15,23,42,0.25)]';

export const APARTMENT_SCENE_BG_IMAGE_CLASS =
  'absolute inset-0 z-0 size-full object-contain object-center select-none [image-rendering:pixelated]';

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
