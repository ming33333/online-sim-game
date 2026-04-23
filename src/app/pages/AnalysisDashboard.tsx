/**
 * Analysis Dashboard - smart bot simulation.
 * Runs one bot with each life choice (privileged, middle, struggling).
 * Tracks: money made, stats over time, inventory, choices.
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '../components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { TrendingUp, DollarSign, Package, Activity, Download } from 'lucide-react';
import { runSimulation, buildLogContent, parseLogContent } from '../../simulator';
import type { SimRunResult } from '../../simulator';
import type { CharacterPresetId } from '../../simulator';
import { round2 } from '../lib/formatNumber';

const CHARACTER_PRESETS: { id: CharacterPresetId; label: string }[] = [
  { id: 'privileged', label: 'Privileged' },
  { id: 'middle', label: 'Middle' },
  { id: 'struggling', label: 'Struggling' },
];

const CHART_COLORS: Record<CharacterPresetId, string> = {
  privileged: '#059669',
  middle: '#2563eb',
  struggling: '#dc2626',
};

export function AnalysisDashboard() {
  const [runs, setRuns] = useState<SimRunResult[]>([]);
  const [running, setRunning] = useState(false);

  const runSimulations = () => {
    setRunning(true);
    const results: SimRunResult[] = [];
    let index = 0;

    const runNext = () => {
      if (index >= CHARACTER_PRESETS.length) {
        setRuns(results);
        setRunning(false);
        return;
      }
      const preset = CHARACTER_PRESETS[index];
      const result = runSimulation({
        characterPresetId: preset.id,
        seed: index * 1000 + 1,
      });
      results.push(result);
      index++;
      setTimeout(runNext, 0);
    };
    runNext();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result as string;
      const { metadata, ticks } = parseLogContent(content);
      if (metadata && ticks.length > 0) {
        const moneyEvents = ticks
          .map((t) => {
            const delta = (t as { moneyDelta?: number }).moneyDelta ??
              (t.stateAfter?.money != null && t.stateBefore?.money != null
                ? t.stateAfter.money - t.stateBefore.money
                : 0);
            return { t, delta };
          })
          .filter(({ delta }) => delta !== 0)
          .map(({ t, delta }) => ({
            tick: t.tick,
            day: t.day ?? (t.year - 2000) * 112 + (t.dayOfYear ?? 0),
            moneyDelta: delta,
            moneyAfter: t.stateAfter?.money ?? 0,
            actionType: t.action?.type ?? 'unknown',
          }));
        const run: SimRunResult = {
          characterPreset: {
            id: metadata.characterPresetId,
            name: metadata.characterPresetId,
            description: '',
            startingMoney: 0,
            beauty: 5,
            smarts: 5,
            fitness: 5,
            social: 5,
          },
          characterPresetId: metadata.characterPresetId as CharacterPresetId,
          ticks,
          finalState: {} as SimRunResult['finalState'],
          outcome: metadata.outcome as SimRunResult['outcome'],
          moneyMade: metadata.moneyMade ?? 0,
          startingMoney: metadata.startingMoney ?? 0,
          statsOverTime: [],
          inventoryOverTime: [],
          moneyEvents,
        };
        for (const t of ticks) {
          if (t.stateAfter) {
            run.statsOverTime.push({
              tick: t.tick,
              day: t.day ?? (t.year - 2000) * 112 + t.dayOfYear,
              health: t.stateAfter.health,
              happiness: t.stateAfter.happiness,
              energy: t.stateAfter.energy,
              hunger: t.stateAfter.hunger,
              money: t.stateAfter.money,
              smarts: t.stateAfter.smarts,
              beauty: t.stateAfter.beauty ?? 5,
              fitness: t.stateAfter.fitness ?? 5,
              social: t.stateAfter.social ?? 5,
            });
          }
        }
        setRuns((prev) => [...prev, run]);
      }
    };
    reader.readAsText(file);
  };

  const handleExport = () => {
    if (runs.length === 0) return;
    const first = runs[0];
    const content = buildLogContent(first);
    const blob = new Blob([content], { type: 'application/ndjson' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sim-${first.characterPresetId}-${new Date().toISOString().slice(0, 10)}.ndjson`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /** Money chart: one point per money event (gain/loss), line rises/drops at each event */
  const moneyChartData = useMemo(() => {
    if (runs.length === 0) return [];
    type EventPoint = { x: number; day: number; hour: number; [key: string]: string | number | undefined };
    const events: EventPoint[] = [];

    for (const run of runs) {
      const pid = run.characterPresetId;
      const ticksWithMoney = run.ticks.filter(
        (t) => (t as { moneyDelta?: number }).moneyDelta != null && (t as { moneyDelta: number }).moneyDelta !== 0
      );
      if (ticksWithMoney.length === 0) {
        events.push({ x: 0, day: 0, hour: 0, [pid]: run.startingMoney, [`${pid}_action`]: 'start', [`${pid}_delta`]: 0 });
        continue;
      }

      events.push({
        x: 0,
        day: 0,
        hour: 0,
        [pid]: run.startingMoney,
        [`${pid}_action`]: 'start',
        [`${pid}_delta`]: 0,
      });

      for (const t of ticksWithMoney) {
        const day = t.day ?? (t.year - 2000) * 112 + (t.dayOfYear ?? 0);
        const hour = t.hourOfDay ?? 0;
        const x = day + hour / 24;
        const delta = (t as { moneyDelta: number }).moneyDelta;
        const money = t.stateAfter?.money ?? 0;
        const action = t.action?.type ?? 'unknown';
        events.push({
          x,
          day,
          hour,
          [pid]: money,
          [`${pid}_action`]: action,
          [`${pid}_delta`]: delta,
        });
      }
    }

    const byX = new Map<number, EventPoint>();
    for (const e of events) {
      const k = Math.round(e.x * 100) / 100;
      const existing = byX.get(k);
      if (!existing) {
        byX.set(k, { ...e });
      } else {
        Object.assign(existing, e);
      }
    }
    return Array.from(byX.values()).sort((a, b) => a.x - b.x);
  }, [runs]);

  /** Stats chart: one point per tick where any stat changed, with action in tooltip */
  const statsEventChartData = useMemo(() => {
    if (runs.length === 0) return [];
    type StatPoint = { x: number; day: number; hour: number; [key: string]: string | number | undefined };
    const events: StatPoint[] = [];

    for (const run of runs) {
      const pid = run.characterPresetId;
      const sb = run.ticks[0]?.stateBefore;
      events.push({
        x: 0,
        day: 0,
        hour: 0,
        [`${pid}_health`]: sb?.health ?? 0,
        [`${pid}_happiness`]: sb?.happiness ?? 0,
        [`${pid}_energy`]: sb?.energy ?? 0,
        [`${pid}_hunger`]: sb?.hunger ?? 0,
        [`${pid}_action`]: 'start',
      });

      for (const t of run.ticks) {
        const before = t.stateBefore;
        const after = t.stateAfter;
        if (!after || !before) continue;
        const day = t.day ?? (t.year - 2000) * 112 + (t.dayOfYear ?? 0);
        const hour = t.hourOfDay ?? 0;
        const x = day + hour / 24;
        const action = t.action?.type ?? 'unknown';
        const hasChange =
          after.health !== before.health ||
          after.happiness !== before.happiness ||
          after.energy !== before.energy ||
          after.hunger !== before.hunger;
        if (!hasChange) continue;

        events.push({
          x,
          day,
          hour,
          [`${pid}_health`]: after.health,
          [`${pid}_happiness`]: after.happiness,
          [`${pid}_energy`]: after.energy,
          [`${pid}_hunger`]: after.hunger,
          [`${pid}_action`]: action,
          [`${pid}_healthDelta`]: round2(after.health - before.health),
          [`${pid}_happinessDelta`]: round2(after.happiness - before.happiness),
          [`${pid}_energyDelta`]: round2(after.energy - before.energy),
          [`${pid}_hungerDelta`]: round2(after.hunger - before.hunger),
        });
      }
    }

    const byX = new Map<number, StatPoint>();
    for (const e of events) {
      const k = Math.round(e.x * 100) / 100;
      const existing = byX.get(k);
      if (!existing) {
        byX.set(k, { ...e });
      } else {
        Object.assign(existing, e);
      }
    }
    return Array.from(byX.values()).sort((a, b) => a.x - b.x);
  }, [runs]);

  const [selectedStat, setSelectedStat] = useState<'health' | 'happiness' | 'energy' | 'hunger'>('health');
  const [statsActionFilter, setStatsActionFilter] = useState<string>('all');
  const [statsDayMin, setStatsDayMin] = useState<string>('');
  const [statsDayMax, setStatsDayMax] = useState<string>('');

  const uniqueActions = useMemo(() => {
    const set = new Set<string>();
    for (const run of runs) {
      for (const t of run.ticks) {
        const a = t.action?.type ?? 'unknown';
        if (a !== 'unknown') set.add(a);
      }
    }
    return Array.from(set).sort();
  }, [runs]);

  const statsEventChartDataFiltered = useMemo(() => {
    let data = statsEventChartData;
    if (statsActionFilter !== 'all') {
      data = data.filter((row) => {
        for (const run of runs) {
          if (row[`${run.characterPresetId}_action`] === statsActionFilter) return true;
        }
        return false;
      });
    }
    const min = statsDayMin === '' ? -Infinity : Number(statsDayMin);
    const max = statsDayMax === '' ? Infinity : Number(statsDayMax);
    if (min > -Infinity || max < Infinity) {
      data = data.filter((row) => {
        const day = row.day as number;
        return day >= min && day <= max;
      });
    }
    return data;
  }, [statsEventChartData, statsActionFilter, statsDayMin, statsDayMax, runs]);

  const inventoryByPreset = useMemo(() => {
    const result: Record<string, Array<{ day: number; regular: number; lux: number }>> = {};
    for (const run of runs) {
      result[run.characterPresetId] = run.inventoryOverTime.map((i) => ({
        day: i.day,
        regular: i.groceriesRegular,
        lux: i.groceriesLux,
      }));
    }
    return result;
  }, [runs]);

  const chartConfig = useMemo(() => {
    const config: Record<string, { label: string; color: string }> = {
      day: { label: 'Day', color: 'hsl(var(--chart-1))' },
      x: { label: 'Time (days)', color: 'hsl(var(--chart-1))' },
    };
    CHARACTER_PRESETS.forEach((p) => {
      config[p.id] = { label: p.label, color: CHART_COLORS[p.id] };
      config[`${p.id}_health`] = { label: `${p.label} health`, color: CHART_COLORS[p.id] };
      config[`${p.id}_happiness`] = { label: `${p.label} happiness`, color: CHART_COLORS[p.id] };
      config[`${p.id}_energy`] = { label: `${p.label} energy`, color: CHART_COLORS[p.id] };
      config[`${p.id}_hunger`] = { label: `${p.label} hunger`, color: CHART_COLORS[p.id] };
    });
    return config;
  }, []);

  return (
    <div className="min-h-screen p-4 bg-gradient-to-br from-slate-100 to-slate-200">
      <div className="max-w-6xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Smart Bot Simulation</CardTitle>
            <CardDescription>
              One bot tries to make as much money as possible in 2 years: degree → job →
              promotions. Survives by eating, sleeping, gym. Runs with each life choice
              (privileged, middle, struggling).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4 items-center">
              <Button onClick={runSimulations} disabled={running}>
                {running ? 'Running...' : 'Run simulation (all 3 presets)'}
              </Button>
              <Button variant="outline" onClick={handleExport} disabled={runs.length === 0}>
                <Download className="size-4 mr-2" />
                Export NDJSON
              </Button>
              <label className="cursor-pointer">
                <span className="inline-flex items-center justify-center rounded-md text-sm font-medium px-4 py-2 border border-input bg-background hover:bg-accent">
                  Load log file
                </span>
                <input
                  type="file"
                  accept=".ndjson,.json,.txt"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
            </div>
            {runs.length > 0 && (
              <p className="text-sm text-muted-foreground">
                Loaded {runs.length} run(s): {runs.map((r) => r.characterPresetId).join(', ')}
              </p>
            )}
          </CardContent>
        </Card>

        {runs.length > 0 && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="size-5" />
                  Money Summary
                </CardTitle>
                <CardDescription>
                  Starting money vs money made in 2 years (by life choice)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {runs.map((r) => (
                    <div
                      key={r.characterPresetId}
                      className="p-4 border rounded-lg bg-white"
                    >
                      <div className="font-semibold capitalize">
                        {r.characterPreset.name}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Start: ${r.startingMoney.toLocaleString()} → Made: $
                        {r.moneyMade.toLocaleString()} → Final: $
                        {r.finalState.stats.money.toLocaleString()}
                      </div>
                      <div className="text-xs mt-1">
                        Outcome: {r.outcome} · Ticks: {r.ticks.length}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="money">
              <TabsList>
                <TabsTrigger value="money">Money Over Time</TabsTrigger>
                <TabsTrigger value="stats">Stats &amp; Actions</TabsTrigger>
                <TabsTrigger value="inventory">Inventory</TabsTrigger>
              </TabsList>
              <TabsContent value="money" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="size-5" />
                      Money over time
                    </CardTitle>
                    <CardDescription>
                      Money at each gain/loss — line rises or drops at every event. Hover to see why.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {moneyChartData.length > 0 ? (
                      <ChartContainer config={chartConfig} className="h-[350px]">
                        <LineChart data={moneyChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="x" name="Day" label={{ value: 'Time (days)', position: 'bottom' }} tickFormatter={(v) => String(Math.floor(v))} />
                          <YAxis label={{ value: 'Money ($)', angle: -90, position: 'insideLeft' }} tickFormatter={(v) => `$${v}`} />
                          <ChartTooltip
                            content={
                              <ChartTooltipContent
                                formatter={(v) => `$${Number(v).toLocaleString()}`}
                                labelFormatter={(_, payload) => {
                                  const p = payload?.[0]?.payload;
                                  if (!p) return '';
                                  const day = Math.floor(p.x);
                                  const hour = Math.round((p.x - day) * 24);
                                  let label = `Day ${day}${hour > 0 ? `, ${hour}:00` : ''}`;
                                  const actions: string[] = [];
                                  for (const run of runs) {
                                    const act = p[`${run.characterPresetId}_action`];
                                    const delta = p[`${run.characterPresetId}_delta`];
                                    if (act && act !== 'start' && delta != null && delta !== 0) {
                                      const actionLabel = (act as string).replace(/-/g, ' ');
                                      const sign = (delta as number) >= 0 ? '+' : '';
                                      actions.push(`${run.characterPreset.name}: ${actionLabel} (${sign}$${(delta as number).toLocaleString()})`);
                                    }
                                  }
                                  if (actions.length > 0) label += ` — ${actions.join(' · ')}`;
                                  return label;
                                }}
                              />
                            }
                          />
                          <ChartLegend content={<ChartLegendContent />} />
                          {CHARACTER_PRESETS.map((p) => (
                            <Line
                              key={p.id}
                              type="monotone"
                              dataKey={p.id}
                              name={p.label}
                              stroke={CHART_COLORS[p.id]}
                              strokeWidth={2}
                              dot={{ r: 2, fill: CHART_COLORS[p.id] }}
                              connectNulls
                              activeDot={{ r: 5, fill: CHART_COLORS[p.id] }}
                            />
                          ))}
                        </LineChart>
                      </ChartContainer>
                    ) : (
                      <p className="text-muted-foreground py-8 text-center">No data</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="stats" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="size-5" />
                      Stats &amp; actions over time
                    </CardTitle>
                    <CardDescription>
                      Stat value at each action that changed it. Hover to see when and what action changed the stat.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-4 items-center">
                      <div className="flex gap-2 items-center">
                        <span className="text-sm font-medium">Stat:</span>
                        <select
                          className="rounded border px-2 py-1 text-sm"
                          value={selectedStat}
                          onChange={(e) => setSelectedStat(e.target.value as typeof selectedStat)}
                        >
                          <option value="health">Health</option>
                          <option value="happiness">Happiness</option>
                          <option value="energy">Energy</option>
                          <option value="hunger">Hunger</option>
                        </select>
                      </div>
                      <div className="flex gap-2 items-center">
                        <span className="text-sm font-medium">Action:</span>
                        <select
                          className="rounded border px-2 py-1 text-sm"
                          value={statsActionFilter}
                          onChange={(e) => setStatsActionFilter(e.target.value)}
                        >
                          <option value="all">All actions</option>
                          {uniqueActions.map((a) => (
                            <option key={a} value={a}>{a.replace(/-/g, ' ')}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex gap-2 items-center">
                        <span className="text-sm font-medium">Day range:</span>
                        <input
                          type="number"
                          min={0}
                          placeholder="From"
                          className="w-20 rounded border px-2 py-1 text-sm"
                          value={statsDayMin}
                          onChange={(e) => setStatsDayMin(e.target.value)}
                        />
                        <span className="text-muted-foreground">–</span>
                        <input
                          type="number"
                          min={0}
                          placeholder="To"
                          className="w-20 rounded border px-2 py-1 text-sm"
                          value={statsDayMax}
                          onChange={(e) => setStatsDayMax(e.target.value)}
                        />
                        <span className="text-xs text-muted-foreground">(leave empty for all)</span>
                      </div>
                    </div>
                    {statsEventChartDataFiltered.length > 0 ? (
                      <ChartContainer config={chartConfig} className="h-[350px]">
                        <LineChart data={statsEventChartDataFiltered}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="x" label={{ value: 'Time (days)', position: 'bottom' }} tickFormatter={(v) => String(Math.floor(v))} />
                          <YAxis domain={[0, 100]} label={{ value: selectedStat, angle: -90, position: 'insideLeft' }} />
                          <ChartTooltip
                            content={
                              <ChartTooltipContent
                                formatter={(v) => String(v)}
                                labelFormatter={(_, payload) => {
                                  const p = payload?.[0]?.payload;
                                  if (!p) return '';
                                  const day = Math.floor(p.x);
                                  const hour = Math.round((p.x - day) * 24);
                                  let label = `Day ${day}${hour > 0 ? `, ${hour}:00` : ''}`;
                                  const parts: string[] = [];
                                  for (const run of runs) {
                                    const act = p[`${run.characterPresetId}_action`];
                                    const delta = p[`${run.characterPresetId}_${selectedStat}Delta`];
                                    if (act && act !== 'start') {
                                      const actionLabel = (act as string).replace(/-/g, ' ');
                                      const d = delta != null && delta !== 0 ? ` (${(delta as number) >= 0 ? '+' : ''}${delta})` : '';
                                      parts.push(`${run.characterPreset.name}: ${actionLabel}${d}`);
                                    }
                                  }
                                  if (parts.length > 0) label += ` — ${parts.join(' · ')}`;
                                  return label;
                                }}
                              />
                            }
                          />
                          <ChartLegend content={<ChartLegendContent />} />
                          {CHARACTER_PRESETS.map((p) => (
                            <Line
                              key={p.id}
                              type="monotone"
                              dataKey={`${p.id}_${selectedStat}`}
                              name={p.label}
                              stroke={CHART_COLORS[p.id]}
                              strokeWidth={2}
                              dot={{ r: 2, fill: CHART_COLORS[p.id] }}
                              connectNulls
                              activeDot={{ r: 5, fill: CHART_COLORS[p.id] }}
                            />
                          ))}
                        </LineChart>
                      </ChartContainer>
                    ) : statsEventChartData.length > 0 ? (
                      <p className="text-muted-foreground py-8 text-center">No data matches the current filters. Try adjusting action or day range.</p>
                    ) : (
                      <p className="text-muted-foreground py-8 text-center">No data</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="inventory" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="size-5" />
                      Inventory (groceries) over time
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {runs.map((r) => {
                        const inv = inventoryByPreset[r.characterPresetId];
                        if (!inv || inv.length === 0) return null;
                        const last = inv[inv.length - 1];
                        const bought = r.ticks.filter(
                          (t) => t.action?.type === 'buy-groceries'
                        ).length;
                        return (
                          <div
                            key={r.characterPresetId}
                            className="p-3 border rounded bg-white"
                          >
                            <div className="font-medium capitalize">
                              {r.characterPresetId}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Final: {last.regular} regular, {last.lux} luxury meals ·
                              Grocery trips: {bought} · Apartment:{' '}
                              {r.finalState.selectedApartment?.name ?? 'none'} · Job:{' '}
                              {r.finalState.selectedJob
                                ? r.finalState.selectedJob.promotionTiers[
                                    r.finalState.jobTierIndex
                                  ]
                                : 'none'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
}
