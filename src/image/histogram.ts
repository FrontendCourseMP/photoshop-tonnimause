import type { Raster } from './types';
import type { ChannelId } from './channels';
import { linearComponent, relativeLuminance } from './luminance';

export type LevelsChannel = 'master' | ChannelId;
export type HistogramScale = 'linear' | 'log';

/** Учитываем все исходные пиксели, включая скрытые цвета, без взвешивания по альфе.
 * Master: относительная светлота, https://www.w3.org/WAI/GL/wiki/Relative_luminance
 */
export function histogram(source: Raster, channel: LevelsChannel, maximum: 127 | 255): Uint32Array {
  const bins = new Uint32Array(maximum + 1);
  const component = { gray: 0, red: 0, green: 1, blue: 2, alpha: 3 };
  for (let at = 0; at < source.data.length; at += 4) {
    const value = channel === 'master'
      ? relativeLuminance(linearComponent(source.data[at]!), linearComponent(source.data[at + 1]!), linearComponent(source.data[at + 2]!))
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
