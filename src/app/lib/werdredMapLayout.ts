import type { DistrictName } from '../../game/types';

export const DISTRICT_POSITIONS: Record<DistrictName, { x: number; y: number }> = {
  Dewmist: { x: 12.5, y: 12.5 },
  Semba: { x: 37.5, y: 12.5 },
  Centerlight: { x: 37.5, y: 62.5 },
  Ellum: { x: 62.5, y: 62.5 },
  Marina: { x: 37.5, y: 87.5 },
};

export const DISTRICT_NAMES: DistrictName[] = ['Dewmist', 'Semba', 'Centerlight', 'Ellum', 'Marina'];

/** Horizontal/vertical rail graph — travel animation follows this. */
export const TRACK_GRAPH: Record<DistrictName, DistrictName[]> = {
  Dewmist: ['Semba'],
  Semba: ['Dewmist', 'Centerlight'],
  Centerlight: ['Semba', 'Ellum', 'Marina'],
  Ellum: ['Centerlight'],
  Marina: ['Centerlight'],
};
