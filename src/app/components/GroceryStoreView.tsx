import React from 'react';
import { motion } from 'motion/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { ShoppingCart, Backpack, Sparkles, Scissors } from 'lucide-react';
import {
  BACKPACK_TYPES,
  SNACK_TYPES,
  BACKPACK_BY_ID,
  type BackpackId,
  type SnackId,
} from '../lib/inventory';
import { formatMoney, fmt2 } from '../lib/formatNumber';
import { gameChromePanel, gameChromePhaseCardHeader } from '../lib/gameChrome';
import { SKINCARE_PRODUCTS, HAIRCUT_OPTIONS, type SkincareId, type HaircutId } from '../lib/beautyCare';

export type GroceryOption =
  | 'single'
  | 'single-lux'
  | '1week'
  | '2week'
  | '4week'
  | '1week-lux'
  | '2week-lux'
  | '4week-lux';

const MEAL_OPTIONS: { id: GroceryOption; label: string; meals: number; hungerPerMeal: number; cost: number }[] = [
  { id: 'single', label: '1 meal', meals: 1, hungerPerMeal: 30, cost: 20 },
  { id: '1week', label: '1 week', meals: 10, hungerPerMeal: 30, cost: 150 },
  { id: '2week', label: '2 weeks', meals: 22, hungerPerMeal: 30, cost: 300 },
  { id: '4week', label: '4 weeks', meals: 48, hungerPerMeal: 30, cost: 400 },
  { id: 'single-lux', label: '1 meal (luxury)', meals: 1, hungerPerMeal: 50, cost: 25 },
  { id: '1week-lux', label: '1 week (luxury)', meals: 10, hungerPerMeal: 50, cost: 210 },
  { id: '2week-lux', label: '2 weeks (luxury)', meals: 22, hungerPerMeal: 50, cost: 420 },
  { id: '4week-lux', label: '4 weeks (luxury)', meals: 48, hungerPerMeal: 50, cost: 560 },
];

interface GroceryStoreViewProps {
  currentMoney: number;
  onBuyGroceries: (option: GroceryOption, meals: number, hungerPerMeal: number, cost: number) => void;
  onBuyFastFood: (name: string, hungerGain: number, cost: number, healthPenalty: number) => void;
  backpackId: BackpackId | null;
  snackCounts: Record<SnackId, number>;
  backpackSpaceUsed: number;
  backpackCapacity: number;
  onBuyBackpack: (id: BackpackId) => void;
  onBuySnack: (id: SnackId) => void;
  onOpenMapOverlay: () => void;
  skincareDoses: Record<SkincareId, number>;
  onBuySkincare: (id: SkincareId) => void;
  onGetHaircut: (id: HaircutId) => void;
  haircutSalon: { canCut: boolean; daysRemaining: number; nextDateLabel: string };
}

export function GroceryStoreView({
  currentMoney,
  onBuyGroceries,
  onBuyFastFood,
  backpackId,
  snackCounts,
  backpackSpaceUsed,
  backpackCapacity,
  onBuyBackpack,
  onBuySnack,
  onOpenMapOverlay,
  skincareDoses,
  onBuySkincare,
  onGetHaircut,
  haircutSalon,
}: GroceryStoreViewProps) {
  return (
    <Card className={`${gameChromePanel} w-full min-h-full flex flex-col`}>
      <CardHeader
        className={`flex items-center justify-between gap-2 flex-shrink-0 py-2 px-3 ${gameChromePhaseCardHeader}`}
      >
        <div className="min-w-0">
          <CardTitle className="text-base flex items-center gap-2 text-slate-900">
            <ShoppingCart className="size-4 text-sky-700" />
            Grocery Store
          </CardTitle>
          <CardDescription className="text-xs text-slate-700">
            Meals, skincare (auto daily routine), salon cuts, backpacks, and snacks.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={onOpenMapOverlay} className="text-xs shrink-0">
          Map
        </Button>
      </CardHeader>
      <CardContent className="space-y-4 px-3 sm:px-4 pb-4 pt-2">
        <div>
          <p className="text-xs font-medium text-gray-700 mb-2">Fast food (buy + eat now, but less healthy)</p>
          <div className="space-y-2">
            {[
              { name: 'Burger combo', hungerGain: 25, cost: 22.5, healthPenalty: 2 },
              { name: 'Fried chicken box', hungerGain: 35, cost: 32.5, healthPenalty: 3 },
            ].map((opt) => (
              <div
                key={opt.name}
                className="flex items-center justify-between p-3 rounded-lg border-2 border-rose-200 bg-rose-50/50"
              >
                <div>
                  <span className="font-semibold text-sm">{opt.name}</span>
                  <span className="text-xs text-gray-600 block">
                    +{opt.hungerGain} hunger now · Health −{opt.healthPenalty} · No energy cost
                  </span>
                </div>
                <motion.div whileTap={{ scale: 0.94 }} className="inline-flex">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-rose-300 shadow-sm transition-shadow duration-150"
                    disabled={currentMoney < opt.cost}
                    title={
                      currentMoney < opt.cost
                        ? `Need $${formatMoney(opt.cost)} (you have $${formatMoney(currentMoney)})`
                        : undefined
                    }
                    onClick={() => onBuyFastFood(opt.name, opt.hungerGain, opt.cost, opt.healthPenalty)}
                  >
                    {`$${formatMoney(opt.cost)}`}
                  </Button>
                </motion.div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-gray-700 flex items-center gap-1.5 mb-2">
            <Backpack className="size-3.5" />
            Backpacks (buy one; better packs hold more space)
          </p>
          <div className="space-y-2">
            {BACKPACK_TYPES.map((bp) => {
              const owned = backpackId === bp.id;
              const canAfford = currentMoney >= bp.cost;
              const fitsInventory = backpackSpaceUsed <= bp.capacity;
              const canBuy = canAfford && fitsInventory;
              return (
                <div
                  key={bp.id}
                  className="flex items-center justify-between p-3 rounded-lg border-2 border-sky-200 bg-sky-50/50"
                >
                  <div>
                    <span className="font-semibold text-sm">{bp.name}</span>
                    <span className="text-xs text-gray-600 block">
                      {bp.capacity} space unit{bp.capacity === 1 ? '' : 's'} · {bp.description}
                    </span>
                  </div>
                  <motion.div whileTap={{ scale: 0.94 }} className="inline-flex">
                    <Button
                      size="sm"
                      variant={owned ? 'secondary' : 'default'}
                      disabled={owned || !canBuy}
                      onClick={() => onBuyBackpack(bp.id)}
                      title={
                        owned
                          ? 'Already equipped'
                          : !canAfford
                            ? `Need $${formatMoney(bp.cost)} (you have $${formatMoney(currentMoney)})`
                            : !fitsInventory
                              ? 'Eat snacks or drop to-go meals — your items exceed this pack’s capacity'
                              : undefined
                      }
                      className="transition-shadow duration-150"
                    >
                      {owned ? 'Equipped' : `$${formatMoney(bp.cost)}`}
                    </Button>
                  </motion.div>
                </div>
              );
            })}
          </div>
          {backpackId && (
            <p className="text-[10px] text-gray-500 mt-1">
              Carrying {backpackSpaceUsed}/{backpackCapacity} space · {BACKPACK_BY_ID[backpackId].name}
            </p>
          )}
        </div>

        <div>
          <p className="text-xs font-medium text-gray-700 mb-2">Portable snacks (eat at home from inventory)</p>
          <div className="space-y-2">
            {SNACK_TYPES.filter((s) => !s.gymOnly).map((s) => {
              const count = snackCounts[s.id] ?? 0;
              const cap = backpackCapacity;
              const fits = cap > 0 && backpackSpaceUsed + s.spaceUnits <= cap;
              const canBuy = currentMoney >= s.cost && fits;
              return (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-3 rounded-lg border-2 border-emerald-200 bg-emerald-50/40"
                >
                  <div>
                    <span className="font-semibold text-sm">{s.label}</span>
                    <span className="text-xs text-gray-600 block">
                      +{s.hunger} hunger · {s.spaceUnits} space · owned: {count}
                    </span>
                  </div>
                  <motion.div whileTap={{ scale: 0.94 }} className="inline-flex">
                    <Button
                      size="sm"
                      disabled={!canBuy}
                      variant="outline"
                      className="border-emerald-400 transition-shadow duration-150"
                      onClick={() => onBuySnack(s.id)}
                      title={
                        !canBuy
                          ? cap <= 0
                            ? 'Buy a backpack first'
                            : !fits
                              ? 'Not enough free backpack space for this snack'
                              : currentMoney < s.cost
                                ? `Need $${formatMoney(s.cost)} (you have $${formatMoney(currentMoney)})`
                                : undefined
                          : undefined
                      }
                    >
                      {`$${formatMoney(s.cost)}`}
                    </Button>
                  </motion.div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-none border-[3px] border-[#1a2332] bg-[#e6ecf4] p-3 space-y-2 shadow-[2px_2px_0_0_rgba(15,23,42,0.15)]">
          <p className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-pink-600" />
            Skincare (grocery aisle)
          </p>
          <p className="text-[10px] text-slate-700 leading-snug">
            Each product adds daily doses. While you have doses left, that item auto-applies once each in-game morning
            (1× per product per day). Stack all three for combined glow.
          </p>
          <div className="space-y-2">
            {SKINCARE_PRODUCTS.map((p) => {
              const doses = skincareDoses[p.id];
              const canBuy = currentMoney >= p.cost;
              return (
                <div
                  key={p.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-2.5 rounded-none border-2 border-[#1a2332]/40 bg-[#f8fafc]"
                >
                  <div className="min-w-0">
                    <span className="font-semibold text-sm text-slate-900">{p.name}</span>
                    <span className="text-[10px] text-slate-600 block leading-snug">{p.description}</span>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      +{p.dosesPerPurchase} doses · +{fmt2(p.dailyBeauty)} beauty per auto-day each · stock: {doses}{' '}
                      dose{doses === 1 ? '' : 's'}
                    </span>
                  </div>
                  <motion.div whileTap={{ scale: 0.96 }} className="inline-flex shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-[#1a2332] rounded-none"
                      disabled={!canBuy}
                      title={!canBuy ? `Need $${formatMoney(p.cost)}` : undefined}
                      onClick={() => onBuySkincare(p.id)}
                    >
                      ${formatMoney(p.cost)}
                    </Button>
                  </motion.div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-none border-[3px] border-[#1a2332] bg-[#e6ecf4] p-3 space-y-2 shadow-[2px_2px_0_0_rgba(15,23,42,0.15)]">
          <p className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
            <Scissors className="size-3.5 text-sky-700" />
            Hair salon (in-store)
          </p>
          <p className="text-[10px] text-slate-700 leading-snug">
            Pricier cuts are more likely to boost beauty. Budget trims are riskier (small chance of a bad cut). Max{' '}
            <strong>one haircut per in-game week</strong>. Each option takes 1 hour.
          </p>
          {!haircutSalon.canCut && (
            <p className="text-[10px] text-amber-950 bg-amber-100/95 border border-amber-800/35 px-2 py-1.5 rounded-none leading-snug">
              Next haircut in <strong>{haircutSalon.daysRemaining}</strong> day
              {haircutSalon.daysRemaining === 1 ? '' : 's'}. You can book again starting{' '}
              <strong>{haircutSalon.nextDateLabel}</strong>.
            </p>
          )}
          <div className="space-y-2">
            {HAIRCUT_OPTIONS.map((h) => {
              const canAfford = currentMoney >= h.cost;
              const blocked = !haircutSalon.canCut || !canAfford;
              const title = !haircutSalon.canCut
                ? `Wait ${haircutSalon.daysRemaining} more day${haircutSalon.daysRemaining === 1 ? '' : 's'} — available from ${haircutSalon.nextDateLabel}.`
                : !canAfford
                  ? `Need $${formatMoney(h.cost)} (you have $${formatMoney(currentMoney)}).`
                  : undefined;
              return (
                <div
                  key={h.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-2.5 rounded-none border-2 border-[#1a2332]/40 bg-[#f8fafc]"
                >
                  <div className="min-w-0">
                    <span className="font-semibold text-sm text-slate-900">{h.label}</span>
                    <span className="text-[10px] text-slate-600 block">
                      {h.id === 'budget'
                        ? 'Lower chance of +beauty; higher mishap risk.'
                        : h.id === 'regular'
                          ? 'Good odds for +beauty; small mishap chance.'
                          : 'Best odds for +beauty; no bad-cut penalty.'}
                    </span>
                  </div>
                  <motion.div whileTap={{ scale: 0.96 }} className="inline-flex shrink-0">
                    <Button
                      size="sm"
                      className="rounded-none border-[3px] border-[#1a2332] bg-gradient-to-r from-slate-600 via-sky-600 to-cyan-500 text-white shadow-[2px_2px_0_0_#0f172a]"
                      disabled={blocked}
                      title={title}
                      onClick={() => onGetHaircut(h.id)}
                    >
                      ${formatMoney(h.cost)} · 1h
                    </Button>
                  </motion.div>
                </div>
              );
            })}
          </div>
        </div>

        <p className="text-xs font-medium text-gray-700">Regular groceries (30 hunger/meal)</p>
        <div className="space-y-2">
          {MEAL_OPTIONS.filter((o) => !o.id.includes('-lux')).map((opt) => (
            <div
              key={opt.id}
              className="flex items-center justify-between p-3 rounded-lg border-2 border-gray-200 bg-white"
            >
              <div>
                <span className="font-semibold text-sm">{opt.label}</span>
                <span className="text-xs text-gray-600 block">
                  {opt.meals} meals · {opt.meals * opt.hungerPerMeal} hunger total
                </span>
              </div>
              <motion.div whileTap={{ scale: 0.94 }} className="inline-flex">
                <Button
                  size="sm"
                  disabled={currentMoney < opt.cost}
                  title={
                    currentMoney < opt.cost
                      ? `Need $${formatMoney(opt.cost)} (you have $${formatMoney(currentMoney)})`
                      : undefined
                  }
                  onClick={() => onBuyGroceries(opt.id, opt.meals, opt.hungerPerMeal, opt.cost)}
                  className="shadow-sm transition-shadow duration-150"
                >
                  {`$${formatMoney(opt.cost)}`}
                </Button>
              </motion.div>
            </div>
          ))}
        </div>
        <p className="text-xs font-medium text-gray-700 pt-2">Luxury groceries (50 hunger/meal, 40% more)</p>
        <div className="space-y-2">
          {MEAL_OPTIONS.filter((o) => o.id.includes('-lux')).map((opt) => (
            <div
              key={opt.id}
              className="flex items-center justify-between p-3 rounded-lg border-2 border-amber-200 bg-amber-50/50"
            >
              <div>
                <span className="font-semibold text-sm">{opt.label}</span>
                <span className="text-xs text-gray-600 block">
                  {opt.meals} meals · {opt.meals * opt.hungerPerMeal} hunger total
                </span>
              </div>
              <motion.div whileTap={{ scale: 0.94 }} className="inline-flex">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-amber-400 shadow-sm transition-shadow duration-150"
                  disabled={currentMoney < opt.cost}
                  title={
                    currentMoney < opt.cost
                      ? `Need $${formatMoney(opt.cost)} (you have $${formatMoney(currentMoney)})`
                      : undefined
                  }
                  onClick={() => onBuyGroceries(opt.id, opt.meals, opt.hungerPerMeal, opt.cost)}
                >
                  {`$${formatMoney(opt.cost)}`}
                </Button>
              </motion.div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
