import type { Raster } from './types';
import type { ChannelId } from './channels';

export type LevelsChannel = 'master' | ChannelId;
export type HistogramScale = 'linear' | 'log';
const linear = Float64Array.from({ length: 256 }, (_, value) => {
  const v = value / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
});

/** Counts every source pixel, including hidden colors. Alpha is never used as a weight.
 * Master: relative luminance, https://www.w3.org/WAI/GL/wiki/Relative_luminance
 */
export function histogram(source: Raster, channel: LevelsChannel, maximum: 127 | 255): Uint32Array {
  const bins = new Uint32Array(maximum + 1);
  const component = { gray: 0, red: 0, green: 1, blue: 2, alpha: 3 };
  for (let at = 0; at < source.data.length; at += 4) {
    const value = channel === 'master'
      ? 0.2126 * linear[source.data[at]!]! + 0.7152 * linear[source.data[at + 1]!]! + 0.0722 * linear[source.data[at + 2]!]!
      : source.data[at + component[channel]]! / 255;
    const index = Math.min(maximum, Math.max(0, Math.round(value * maximum)));
    bins[index] = bins[index]! + 1;
  }
  return bins;
}

export function histogramHeights(bins: Uint32Array, scale: HistogramScale): number[] {
  const values = Array.from(bins, value => scale === 'log' ? Math.log1p(value) : value);
  const peak = Math.max(...values);
  return values.map(value => peak === 0 ? 0 : value / peak);
}
