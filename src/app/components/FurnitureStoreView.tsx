import React from 'react';
import { formatMoney } from '../lib/formatNumber';
import { motion } from 'motion/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Armchair } from 'lucide-react';
import { FURNITURE_ITEMS, type HomeFurnitureState } from '../lib/furniture';
import { gameChromePanel, gameChromePhaseCardHeader } from '../lib/gameChrome';

const shopItems = FURNITURE_ITEMS.filter((i) => i.cost > 0);

interface FurnitureStoreViewProps {
  currentMoney: number;
  homeFurniture: HomeFurnitureState;
  onBuyFurniture: (itemId: string) => void;
  onOpenFurnitureSell: () => void;
  onOpenMapOverlay: () => void;
}

export function FurnitureStoreView({
  currentMoney,
  homeFurniture,
  onBuyFurniture,
  onOpenFurnitureSell,
  onOpenMapOverlay,
}: FurnitureStoreViewProps) {
  return (
    <Card className={`${gameChromePanel} w-full min-h-full flex flex-col`}>
      <CardHeader
        className={`flex items-center justify-between gap-2 flex-shrink-0 py-2 px-3 ${gameChromePhaseCardHeader}`}
      >
        <div className="min-w-0">
          <CardTitle className="text-base flex items-center gap-2 text-slate-900">
            <Armchair className="size-4 text-sky-700" />
            Furniture store
          </CardTitle>
          <CardDescription className="text-xs text-slate-700">
            Beds, appliances, TVs, and decor. Sell pieces you own from home via &quot;Sell used…&quot;.
          </CardDescription>
        </div>
        <div className="flex gap-1 shrink-0">
          <Button size="sm" variant="outline" className="text-xs" onClick={onOpenFurnitureSell}>
            Sell used…
          </Button>
          <Button variant="outline" size="sm" onClick={onOpenMapOverlay} className="text-xs">
            Map
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 px-3 sm:px-4 pb-4 pt-2">
        {(['bed', 'fridge', 'stove', 'decoration'] as const).map((cat) => (
          <div key={cat}>
            <div className="text-[10px] font-bold text-gray-500 uppercase mb-2">{cat}</div>
            <div className="space-y-2">
              {shopItems
                .filter((i) => (cat === 'fridge' ? i.category === 'fridge' || i.category === 'tv' : i.category === cat))
                .map((item) => {
                  const owned =
                    (item.category === 'bed' && homeFurniture.bedId === item.id) ||
                    (item.category === 'fridge' && homeFurniture.fridgeId === item.id) ||
                    (item.category === 'stove' && homeFurniture.stoveId === item.id) ||
                    (item.category === 'tv' && homeFurniture.tvId === item.id) ||
                    (item.category === 'decoration' && homeFurniture.decorationIds.includes(item.id));
                  const canBuy = currentMoney >= item.cost && !owned;
                  return (
                    <motion.div
                      key={item.id}
                      whileTap={{ scale: 0.99 }}
                      className="flex gap-2 items-start p-3 rounded-none border border-slate-500/50 bg-[#f4f7fc] text-xs"
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
                        title={
                          owned
                            ? 'Already owned'
                            : currentMoney < item.cost
                              ? `Need $${item.cost.toLocaleString()} (you have $${formatMoney(currentMoney)})`
                              : undefined
                        }
                        onClick={() => onBuyFurniture(item.id)}
                      >
                        {owned ? 'Owned' : 'Buy'}
                      </Button>
                    </motion.div>
                  );
                })}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
