/**
 * Data logger for simulation runs.
 * Outputs NDJSON (one JSON object per line) for easy parsing.
 */

import type { SimRunResult, SimTick } from './run-simulation';

export interface RunMetadata {
  characterPresetId: string;
  seed?: number;
  startTime: string;
  tickCount: number;
  outcome: string;
  moneyMade?: number;
  startingMoney?: number;
}

/** Serialize a single tick to NDJSON line */
export function serializeTick(tick: SimTick): string {
  return JSON.stringify(tick);
}

/** Serialize run metadata (first line of log file) */
export function serializeMetadata(
  result: Pick<SimRunResult, 'characterPreset' | 'characterPresetId' | 'ticks' | 'outcome' | 'moneyMade' | 'startingMoney'>,
  seed?: number
): string {
  const meta: RunMetadata = {
    characterPresetId: result.characterPresetId,
    seed,
    startTime: new Date().toISOString(),
    tickCount: result.ticks.length,
    outcome: result.outcome,
    moneyMade: result.moneyMade,
    startingMoney: result.startingMoney,
  };
  return JSON.stringify({ type: 'metadata', ...meta });
}

/** Build full NDJSON log content from a run */
export function buildLogContent(
  result: Pick<SimRunResult, 'characterPreset' | 'characterPresetId' | 'ticks' | 'outcome' | 'moneyMade' | 'startingMoney'>,
  seed?: number
): string {
  const lines: string[] = [serializeMetadata(result, seed)];
  for (const tick of result.ticks) {
    lines.push(serializeTick(tick));
  }
  return lines.join('\n');
}

/** Parse NDJSON log content into ticks + metadata */
export function parseLogContent(content: string): {
  metadata: RunMetadata | null;
  ticks: SimTick[];
} {
  const lines = content.trim().split('\n').filter(Boolean);
  let metadata: RunMetadata | null = null;
  const ticks: SimTick[] = [];

  for (const line of lines) {
    try {
      const obj = JSON.parse(line);
      if (obj.type === 'metadata') {
        const { type: _, ...meta } = obj;
        metadata = meta;
      } else {
        ticks.push(obj as SimTick);
      }
    } catch {
      // skip invalid lines
    }
  }
  return { metadata, ticks };
}
