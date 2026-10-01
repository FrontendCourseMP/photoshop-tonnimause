import type { LevelsChannel } from './histogram';
import type { Raster } from './types';
import { encodedComponent, linearComponent, relativeLuminance } from './luminance';

export interface InputLevels { black: number; white: number; gamma: number }
export type LevelsSettings = Partial<Record<LevelsChannel, InputLevels>>;
export const defaultLevels = (maximum: number): InputLevels => ({ black: 0, white: maximum, gamma: 1 });

export function updateLevels(current: InputLevels, field: keyof InputLevels, value: number, maximum: number): InputLevels {
  if (!Number.isFinite(value)) return current;
  if (field === 'black') return { ...current, black: Math.max(0, Math.min(current.white - 1, Math.round(value))) };
  if (field === 'white') return { ...current, white: Math.min(maximum, Math.max(current.black + 1, Math.round(value))) };
  return { ...current, gamma: Math.max(0.1, Math.min(9.9, value)) };
}

// Средний маркер соответствует значению 0,5 после преобразования нормированного компонента.
export function midpoint(levels: InputLevels): number {
  return levels.black + (levels.white - levels.black) * 0.5 ** levels.gamma;
}
export function gammaAtPosition(levels: InputLevels, position: number): number {
  const fraction = (position - levels.black) / (levels.white - levels.black);
  return Math.max(0.1, Math.min(9.9, Math.log(Math.max(0.5 ** 9.9, Math.min(0.5 ** 0.1, fraction))) / Math.log(0.5)));
}

export function levelsLut(levels: InputLevels, maximum: number): Uint8ClampedArray {
  return Uint8ClampedArray.from({ length: 256 }, (_, value) => {
    const normalized = Math.max(0, Math.min(1, (value * maximum / 255 - levels.black) / (levels.white - levels.black)));
    return Math.round(255 * normalized ** (1 / levels.gamma));
  });
}

/** Сначала Master, затем отдельные цветовые каналы; альфа независимо. Исходный массив не меняется. */
export function applyLevels(source: Raster, settings: LevelsSettings, maximum: number, gray: boolean): Raster {
  const lut = (channel: LevelsChannel) => levelsLut(settings[channel] ?? defaultLevels(maximum), maximum);
  const master = settings.master ?? defaultLevels(maximum);
  const correctLightness = master.black !== 0 || master.white !== maximum || master.gamma !== 1;
  // Столбец включает полуровень с каждой стороны. Отсекаем весь выбранный столбец,
  // сохраняя непрерывность между порогами и исходные 0/1 при нейтральных настройках.
  const black = (master.black === 0 ? 0 : master.black + 0.5) / maximum;
  const white = (master.white === maximum ? maximum : master.white - 0.5) / maximum;
  const colors = gray ? [lut('gray'), lut('gray'), lut('gray')] : [lut('red'), lut('green'), lut('blue')];
  const alpha = lut('alpha');
  const data = new Uint8ClampedArray(source.data.length);
  for (let at = 0; at < data.length; at += 4) {
    let red = source.data[at]!, green = source.data[at + 1]!, blue = source.data[at + 2]!;
    if (correctLightness) {
      const r = linearComponent(red), g = linearComponent(green), b = linearComponent(blue);
      const lightness = relativeLuminance(r, g, b);
      const normalized = white <= black ? (lightness < white ? 0 : 1)
        : Math.max(0, Math.min(1, (lightness - black) / (white - black)));
      const target = normalized ** (1 / master.gamma);
      // Все RGB-компоненты изменяются вместе. Смешивание с чёрным или белым
      // даёт заданную светлоту без выхода за диапазон и обрезания отдельных каналов.
      const factor = target < lightness ? target / lightness
        : lightness < 1 ? (1 - target) / (1 - lightness) : 1;
      const offset = target < lightness ? 0 : 1 - factor;
      red = encodedComponent(r * factor + offset);
      green = encodedComponent(g * factor + offset);
      blue = encodedComponent(b * factor + offset);
    }
    data[at] = colors[0]![red]!; data[at + 1] = colors[1]![green]!; data[at + 2] = colors[2]![blue]!;
    data[at + 3] = alpha[source.data[at + 3]!]!;
  }
  return { width: source.width, height: source.height, data };
}
