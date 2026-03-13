import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { ShoppingCart } from 'lucide-react';

export type GroceryOption = '1week' | '2week' | '4week' | '1week-lux' | '2week-lux' | '4week-lux';

const OPTIONS: { id: GroceryOption; label: string; meals: number; hungerPerMeal: number; cost: number }[] = [
  { id: '1week', label: '1 week', meals: 10, hungerPerMeal: 30, cost: 75 },
  { id: '2week', label: '2 weeks', meals: 22, hungerPerMeal: 30, cost: 150 },
  { id: '4week', label: '4 weeks', meals: 48, hungerPerMeal: 30, cost: 200 },
  { id: '1week-lux', label: '1 week (luxury)', meals: 10, hungerPerMeal: 50, cost: 105 },
  { id: '2week-lux', label: '2 weeks (luxury)', meals: 22, hungerPerMeal: 50, cost: 210 },
  { id: '4week-lux', label: '4 weeks (luxury)', meals: 48, hungerPerMeal: 50, cost: 280 },
];

interface GroceryStoreViewProps {
  currentMoney: number;
  onBuyGroceries: (option: GroceryOption, meals: number, hungerPerMeal: number, cost: number) => void;
  onOpenMapOverlay: () => void;
}

export function GroceryStoreView({
  currentMoney,
  onBuyGroceries,
  onOpenMapOverlay,
}: GroceryStoreViewProps) {
  return (
    <Card className="h-full flex flex-col min-h-0">
      <CardHeader className="flex items-center justify-between gap-2 flex-shrink-0 py-2">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <ShoppingCart className="size-4" />
            Grocery Store
          </CardTitle>
          <CardDescription className="text-xs">
            Buy groceries. Eat meals at home to restore hunger.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={onOpenMapOverlay} className="text-xs">
          Map
        </Button>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 overflow-y-auto space-y-3">
        <p className="text-xs font-medium text-gray-700">Regular groceries (30 hunger/meal)</p>
        <div className="space-y-2">
          {OPTIONS.filter((o) => !o.id.includes('-lux')).map((opt) => (
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
              <Button
                size="sm"
                disabled={currentMoney < opt.cost}
                onClick={() => onBuyGroceries(opt.id, opt.meals, opt.hungerPerMeal, opt.cost)}
              >
                ${opt.cost}
              </Button>
            </div>
          ))}
        </div>
        <p className="text-xs font-medium text-gray-700 pt-2">Luxury groceries (50 hunger/meal, 40% more)</p>
        <div className="space-y-2">
          {OPTIONS.filter((o) => o.id.includes('-lux')).map((opt) => (
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
              <Button
                size="sm"
                variant="outline"
                className="border-amber-400"
                disabled={currentMoney < opt.cost}
                onClick={() => onBuyGroceries(opt.id, opt.meals, opt.hungerPerMeal, opt.cost)}
              >
                ${opt.cost}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
