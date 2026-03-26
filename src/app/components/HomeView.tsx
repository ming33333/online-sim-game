import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Home, UtensilsCrossed, ShoppingBag, Sofa, Sparkles } from 'lucide-react';
import {
  FURNITURE_ITEMS,
  FURNITURE_BY_ID,
  type HomeFurnitureState,
  getSleepEnergyBonusPerHour,
  getChillHappinessPerHour,
  getEatHungerBonus,
} from '../lib/furniture';

interface HomeViewProps {
  apartmentName: string;
  apartmentRent: number;
  isLiveWithParents: boolean;
  currentEnergy: number;
  currentHunger: number;
  currentMoney: number;
  groceries: { regular: number; lux: number };
  homeFurniture: HomeFurnitureState;
  onSleep: (hours: number) => void;
  onEatMeal: (type: 'regular' | 'lux') => void;
  onChill: (hours: number) => void;
  onBuyFurniture: (itemId: string) => void;
  onOpenMapOverlay: () => void;
}

const BASE_ENERGY_PER_HOUR = 10;

const shopItems = FURNITURE_ITEMS.filter((i) => i.cost > 0);

export function HomeView({
  apartmentName,
  apartmentRent,
  isLiveWithParents,
  currentEnergy,
  currentHunger,
  currentMoney,
  groceries,
  homeFurniture,
  onSleep,
  onEatMeal,
  onChill,
  onBuyFurniture,
  onOpenMapOverlay,
}: HomeViewProps) {
  const [hours, setHours] = useState(4);
  const [chillHours, setChillHours] = useState(1);
  const [tab, setTab] = useState<'living' | 'shop'>('living');

  const bedBonus = getSleepEnergyBonusPerHour(homeFurniture);
  const energyPerHour = BASE_ENERGY_PER_HOUR + bedBonus;
  const energyGain = Math.min(hours * energyPerHour, 100 - currentEnergy);
  const chillBonus = getChillHappinessPerHour(homeFurniture);
  const chillHappiness = chillHours * (2 + chillBonus);
  const stoveBonus = getEatHungerBonus(homeFurniture);

  return (
    <div className="flex flex-col gap-3 min-h-0">
      <div className="flex gap-1 flex-shrink-0">
        <Button
          variant={tab === 'living' ? 'default' : 'outline'}
          size="sm"
          className="text-xs"
          onClick={() => setTab('living')}
        >
          <Sofa className="size-3.5 mr-1" />
          Living
        </Button>
        <Button
          variant={tab === 'shop' ? 'default' : 'outline'}
          size="sm"
          className="text-xs"
          onClick={() => setTab('shop')}
        >
          <ShoppingBag className="size-3.5 mr-1" />
          Furniture store
        </Button>
      </div>

      {tab === 'living' && (
        <Card className="flex flex-col min-h-0 flex-1">
          <CardHeader className="flex items-center justify-between gap-2 flex-shrink-0 py-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Home className="size-4" />
                {apartmentName}
              </CardTitle>
              <CardDescription className="text-xs">
                Sleep restores energy{bedBonus > 0 ? ` (${BASE_ENERGY_PER_HOUR}+${bedBonus}/hr from your bed)` : ` (${BASE_ENERGY_PER_HOUR}/hr)`}.
                {apartmentRent > 0 && (
                  <span className="block mt-1 text-gray-600">Rent: ${apartmentRent}/season</span>
                )}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={onOpenMapOverlay} className="text-xs">
              Map
            </Button>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 space-y-4 overflow-y-auto">
            {/* Visual: items in your apartment */}
            <div className="rounded-xl border bg-gradient-to-b from-amber-50/80 to-stone-100/90 p-3 border-amber-200/60">
              <div className="text-[10px] font-semibold text-amber-900/80 uppercase tracking-wide mb-2">
                {isLiveWithParents ? 'Your room' : 'Your place'}
              </div>
              <div className="flex flex-wrap gap-2 min-h-[52px] items-center">
                {homeFurniture.bedId && FURNITURE_BY_ID[homeFurniture.bedId] && (
                  <div
                    className="flex flex-col items-center justify-center w-14 h-14 rounded-lg bg-white shadow-sm border text-[10px] text-center p-1"
                    title={FURNITURE_BY_ID[homeFurniture.bedId].name}
                  >
                    <span className="text-xl leading-none">{FURNITURE_BY_ID[homeFurniture.bedId].icon}</span>
                    <span className="truncate w-full mt-0.5">Bed</span>
                  </div>
                )}
                {homeFurniture.fridgeId && FURNITURE_BY_ID[homeFurniture.fridgeId] && (
                  <div
                    className="flex flex-col items-center justify-center w-14 h-14 rounded-lg bg-white shadow-sm border text-[10px] text-center p-1"
                    title={FURNITURE_BY_ID[homeFurniture.fridgeId].name}
                  >
                    <span className="text-xl leading-none">{FURNITURE_BY_ID[homeFurniture.fridgeId].icon}</span>
                    <span className="truncate w-full mt-0.5">Fridge</span>
                  </div>
                )}
                {homeFurniture.stoveId && FURNITURE_BY_ID[homeFurniture.stoveId] && (
                  <div
                    className="flex flex-col items-center justify-center w-14 h-14 rounded-lg bg-white shadow-sm border text-[10px] text-center p-1"
                    title={FURNITURE_BY_ID[homeFurniture.stoveId].name}
                  >
                    <span className="text-xl leading-none">{FURNITURE_BY_ID[homeFurniture.stoveId].icon}</span>
                    <span className="truncate w-full mt-0.5">Stove</span>
                  </div>
                )}
                {homeFurniture.decorationIds.map((id) => {
                  const d = FURNITURE_BY_ID[id];
                  if (!d) return null;
                  return (
                    <div
                      key={id}
                      className="flex flex-col items-center justify-center w-14 h-14 rounded-lg bg-white shadow-sm border text-[10px] text-center p-1"
                      title={d.name}
                    >
                      <span className="text-xl leading-none">{d.icon}</span>
                      <span className="truncate w-full mt-0.5">Decor</span>
                    </div>
                  );
                })}
                {!homeFurniture.bedId &&
                  !homeFurniture.fridgeId &&
                  !homeFurniture.stoveId &&
                  homeFurniture.decorationIds.length === 0 && (
                    <p className="text-[11px] text-stone-500 italic px-1">
                      Empty nest — visit the furniture store to furnish your home.
                    </p>
                  )}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium">Sleep duration (hours)</label>
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
              <p className="text-[11px] text-gray-500">
                Will restore +{Math.min(hours * energyPerHour, 100 - currentEnergy)} energy
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => onSleep(hours)} className="bg-indigo-600 hover:bg-indigo-700">
                Sleep {hours} hour{hours > 1 ? 's' : ''}
              </Button>
              <Button variant="outline" onClick={() => onSleep(2)}>
                2-Hour Nap
              </Button>
            </div>

            <div className="border-t pt-4 space-y-2">
              <label className="text-xs font-medium flex items-center gap-1">
                <Sparkles className="size-3.5 text-violet-500" />
                Chill at home
              </label>
              <p className="text-[11px] text-gray-600">
                Relax in your apartment. Decorations add extra happiness per hour.
              </p>
              <div className="flex gap-2 items-center">
                <input
                  type="range"
                  min={1}
                  max={4}
                  value={chillHours}
                  onChange={(e) => setChillHours(Number(e.target.value))}
                  className="flex-1"
                />
                <span className="text-sm font-bold w-8">{chillHours}h</span>
              </div>
              <p className="text-[11px] text-violet-700">
                ~+{chillHappiness.toFixed(1)} happiness (base + decor bonuses)
              </p>
              <Button
                variant="secondary"
                className="bg-violet-100 text-violet-900 hover:bg-violet-200 border-violet-200"
                onClick={() => onChill(chillHours)}
              >
                Chill {chillHours}h
              </Button>
            </div>

            {(groceries.regular > 0 || groceries.lux > 0) && (
              <div className="border-t pt-4 space-y-2">
                <label className="text-xs font-medium flex items-center gap-1">
                  <UtensilsCrossed className="size-3.5" />
                  Eat a meal (15 mins, restores hunger)
                </label>
                <p className="text-[11px] text-gray-600">
                  Meals left: {groceries.regular} regular, {groceries.lux} luxury
                </p>
                <div className="flex gap-2 flex-wrap">
                  {groceries.regular > 0 && (
                    <Button variant="outline" size="sm" onClick={() => onEatMeal('regular')}>
                      Regular (+{30 + stoveBonus} hunger)
                    </Button>
                  )}
                  {groceries.lux > 0 && (
                    <Button variant="outline" size="sm" onClick={() => onEatMeal('lux')}>
                      Luxury (+{50 + stoveBonus} hunger)
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === 'shop' && (
        <Card className="flex flex-col flex-1 min-h-0">
          <CardHeader className="py-2">
            <CardTitle className="text-base">Furniture & appliances</CardTitle>
            <CardDescription className="text-xs">
              One bed, fridge, and stove each (buying replaces). You can own multiple decorations.
              {isLiveWithParents
                ? ' At your parents’ place, groceries won’t spoil — that starts when you rent your own apartment.'
                : ' Without a fridge, food spoils a little each day.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 overflow-y-auto max-h-[420px] pr-1">
            {(['bed', 'fridge', 'stove', 'decoration'] as const).map((cat) => (
              <div key={cat}>
                <div className="text-[10px] font-bold text-gray-500 uppercase mb-2">{cat}</div>
                <div className="grid gap-2">
                  {shopItems
                    .filter((i) => i.category === cat)
                    .map((item) => {
                      const owned =
                        (cat === 'bed' && homeFurniture.bedId === item.id) ||
                        (cat === 'fridge' && homeFurniture.fridgeId === item.id) ||
                        (cat === 'stove' && homeFurniture.stoveId === item.id) ||
                        (cat === 'decoration' && homeFurniture.decorationIds.includes(item.id));
                      const canBuy = currentMoney >= item.cost && !owned;
                      return (
                        <div
                          key={item.id}
                          className="flex gap-2 items-start p-2 rounded-lg border bg-white text-xs"
                        >
                          <span className="text-2xl shrink-0">{item.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold">{item.name}</div>
                            <div className="text-[11px] text-gray-600">{item.description}</div>
                            <div className="text-[11px] text-emerald-700 mt-1">${item.cost.toLocaleString()}</div>
                          </div>
                          <Button
                            size="sm"
                            className="shrink-0 h-8 text-[11px]"
                            disabled={!canBuy}
                            onClick={() => onBuyFurniture(item.id)}
                          >
                            {owned ? 'Owned' : 'Buy'}
                          </Button>
                        </div>
                      );
                    })}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
