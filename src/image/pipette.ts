import type { Raster } from './types';

export interface PixelSample { x: number; y: number; r: number; g: number; b: number; alpha: number; lab: { l: number; a: number; b: number } }

/** sRGB -> линейный RGB -> XYZ D50 (адаптация Брэдфорда) -> CIELAB D50.
 * Описание: https://www.w3.org/TR/css-color-4/#color-conversion-code
 */
export function rgbToLab(r: number, g: number, b: number): PixelSample['lab'] {
  const linear = (value: number) => {
    const v = value / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const red = linear(r), green = linear(g), blue = linear(b);
  // Объединённая матрица sRGB и адаптации Брэдфорда для точки белого D50.
  const x = (0.4360747 * red + 0.3850649 * green + 0.1430804 * blue) / 0.96422;
  const y = 0.2225045 * red + 0.7168786 * green + 0.0606169 * blue;
  const z = (0.0139322 * red + 0.0971045 * green + 0.7141733 * blue) / 0.82521;
  const f = (value: number) => value > (6 / 29) ** 3 ? Math.cbrt(value) : value / (3 * (6 / 29) ** 2) + 4 / 29;
  return { l: 116 * f(y) - 16, a: 500 * (f(x) - f(y)), b: 200 * (f(y) - f(z)) };
}

export function pixelAtPoint(source: Raster, rect: { left: number; top: number; width: number; height: number },
  clientX: number, clientY: number): PixelSample | null {
  if (![rect.left, rect.top, rect.width, rect.height, clientX, clientY].every(Number.isFinite)
    || rect.width <= 0 || rect.height <= 0) return null;
  const dx = clientX - rect.left, dy = clientY - rect.top;
  if (dx < 0 || dy < 0 || dx >= rect.width || dy >= rect.height) return null;
  const x = Math.min(source.width - 1, Math.floor(dx * source.width / rect.width));
  const y = Math.min(source.height - 1, Math.floor(dy * source.height / rect.height));
  const at = (y * source.width + x) * 4;
  const r = source.data[at]!, g = source.data[at + 1]!, b = source.data[at + 2]!, alpha = source.data[at + 3]!;
  return { x, y, r, g, b, alpha, lab: rgbToLab(r, g, b) };
}
