import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { LayoutGrid } from 'lucide-react';
import { DECORATION_APARTMENT_LAYOUT, STOVE_APARTMENT_SCENE_CLASS } from '../lib/apartmentSceneLayout';
import {
  getBedApartmentSpriteSrc,
  getFridgeApartmentSpriteSrc,
  getTvApartmentSpriteSrc,
  getDeskApartmentSpriteSrc,
  getStoveApartmentSpriteSrc,
  getDecorationApartmentSpriteSrc,
} from '../lib/furniture';

const PREVIEW_IDS = {
  bed: 'bed-queen',
  fridge: 'fridge-standard',
  stove: 'stove-gas',
  tv: 'tv-crt',
  desk: 'desk-basic',
  plant: 'decor-plant',
  lamp: 'decor-lights',
  art: 'decor-art',
} as const;

type FurnitureToggleKey = keyof typeof PREVIEW_IDS;

const TOGGLE_ITEMS: { key: FurnitureToggleKey; label: string }[] = [
  { key: 'bed', label: 'Bed' },
  { key: 'fridge', label: 'Fridge' },
  { key: 'stove', label: 'Stove' },
  { key: 'tv', label: 'TV' },
  { key: 'desk', label: 'Desk' },
  { key: 'plant', label: 'Plant' },
  { key: 'lamp', label: 'Lamp' },
  { key: 'art', label: 'Art' },
];

const initialVisibility = (): Record<FurnitureToggleKey, boolean> => ({
  bed: true,
  fridge: true,
  stove: true,
  tv: true,
  desk: true,
  plant: true,
  lamp: true,
  art: true,
});

export function FurnitureAnalysisPreview() {
  const [visible, setVisible] = useState(initialVisibility);

  const setKey = (key: FurnitureToggleKey, checked: boolean) => {
    setVisible((v) => ({ ...v, [key]: checked }));
  };

  const decorKeys: FurnitureToggleKey[] = ['art', 'lamp', 'plant'];
  const decorIds = decorKeys.filter((k) => visible[k]).map((k) => PREVIEW_IDS[k]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LayoutGrid className="size-5" />
          Furniture analysis
        </CardTitle>
        <CardDescription>
          Apartment base art with representative furniture sprites. Toggle which pieces appear in
          the scene (not tied to your save).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {TOGGLE_ITEMS.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-2">
              <Checkbox
                id={`furniture-analysis-${key}`}
                checked={visible[key]}
                onCheckedChange={(c) => setKey(key, c === true)}
              />
              <Label htmlFor={`furniture-analysis-${key}`} className="text-sm font-normal cursor-pointer">
                {label}
              </Label>
            </div>
          ))}
        </div>

        <div
          className="relative aspect-[4/5] max-h-[min(56svh,520px)] min-h-[240px] w-full max-w-md mx-auto overflow-hidden rounded-lg border-[3px] border-[#1a2332] bg-[#0a0f14] shadow-[3px_3px_0_0_rgba(15,23,42,0.25)]"
        >
          <img
            src="/assets/buildings/apartment.png"
            alt=""
            className="absolute inset-0 z-0 size-full object-cover object-center select-none [image-rendering:pixelated]"
            width={216}
            height={216}
            decoding="async"
          />
          {decorIds.map((decId) => {
            const src = getDecorationApartmentSpriteSrc(decId);
            const layoutClass = DECORATION_APARTMENT_LAYOUT[decId];
            if (!src || !layoutClass) return null;
            return (
              <img
                key={decId}
                src={src}
                alt=""
                className={layoutClass}
                width={80}
                height={80}
                decoding="async"
              />
            );
          })}
          {visible.fridge && (
            <img
              src={getFridgeApartmentSpriteSrc(PREVIEW_IDS.fridge) ?? '/assets/furniture/simple_fridge.png'}
              alt=""
              className="pointer-events-none absolute bottom-[-4%] right-[-27%] z-[9] w-[78%] max-h-[52%] h-auto origin-bottom-right scale-[2] object-contain object-bottom select-none [image-rendering:pixelated]"
              width={240}
              height={360}
              decoding="async"
            />
          )}
          {visible.stove && (
            <img
              src={getStoveApartmentSpriteSrc(PREVIEW_IDS.stove) ?? '/assets/furniture/stove_hotplate.png'}
              alt=""
              className={STOVE_APARTMENT_SCENE_CLASS}
              width={120}
              height={80}
              decoding="async"
            />
          )}
          {visible.tv && (
            <img
              src={getTvApartmentSpriteSrc(PREVIEW_IDS.tv) ?? '/assets/furniture/simple_tv.png'}
              alt=""
              className="pointer-events-none absolute bottom-[13%] left-[58%] z-[8] w-[30%] max-h-[26%] h-auto object-contain object-bottom select-none [image-rendering:pixelated]"
              width={100}
              height={80}
              decoding="async"
            />
          )}
          {visible.desk && (
            <img
              src={getDeskApartmentSpriteSrc(PREVIEW_IDS.desk) ?? '/assets/furniture/desk.png'}
              alt=""
              className="pointer-events-none absolute bottom-[11%] left-[36%] z-[8] w-[38%] max-h-[24%] h-auto origin-bottom scale-[1.5] object-contain object-bottom select-none [image-rendering:pixelated]"
              width={140}
              height={90}
              decoding="async"
            />
          )}
          {visible.bed && (
            <img
              src={getBedApartmentSpriteSrc(PREVIEW_IDS.bed) ?? '/assets/furniture/simple_bed.png'}
              alt=""
              className="pointer-events-none absolute bottom-[12%] left-[2%] z-10 w-[46%] max-h-[36%] h-auto origin-bottom-left scale-[2] object-contain object-bottom select-none [image-rendering:pixelated]"
              width={120}
              height={80}
              decoding="async"
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
