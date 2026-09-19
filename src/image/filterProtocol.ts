import type { FilterOptions } from './filters';
import type { Raster } from './types';

export interface FilterRequest { source: Raster; options: FilterOptions }
export type FilterResponse = { type: 'progress'; completed: number; total: number }
  | { type: 'result'; raster: Raster } | { type: 'error'; message: string };
