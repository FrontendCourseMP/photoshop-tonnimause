import { checkDimensions } from './limits';
import type { Raster } from './types';

type Sampler = (source: Raster, x: number, y: number, output: Uint8ClampedArray, offset: number) => void;

const nearest: Sampler = (source, x, y, output, offset) => {
  const sx = Math.min(source.width - 1, Math.max(0, Math.floor(x + 0.5)));
  const sy = Math.min(source.height - 1, Math.max(0, Math.floor(y + 0.5)));
  const at = (sy * source.width + sx) * 4;
  for (let c = 0; c < 4; c++) output[offset + c] = source.data[at + c]!;
};

const bilinear: Sampler = (source, x, y, output, offset) => {
  const sx = Math.max(0, Math.min(source.width - 1, x));
  const sy = Math.max(0, Math.min(source.height - 1, y));
  const left = Math.floor(sx), top = Math.floor(sy);
  const dx = sx - left, dy = sy - top;
  let alpha = 0, red = 0, green = 0, blue = 0;
  for (let row = 0; row < 2; row++) for (let col = 0; col < 2; col++) {
    const at = (Math.min(top + row, source.height - 1) * source.width + Math.min(left + col, source.width - 1)) * 4;
    const weight = (col ? dx : 1 - dx) * (row ? dy : 1 - dy);
    const weightedAlpha = source.data[at + 3]! * weight;
    alpha += weightedAlpha;
    red += source.data[at]! * weightedAlpha;
    green += source.data[at + 1]! * weightedAlpha;
    blue += source.data[at + 2]! * weightedAlpha;
  }
  // Интерполируем RGB с учётом альфы, затем возвращаем обычный RGBA, чтобы скрытые цвета не окрашивали края.
  if (alpha > 0) {
    output[offset] = Math.round(red / alpha);
    output[offset + 1] = Math.round(green / alpha);
    output[offset + 2] = Math.round(blue / alpha);
  }
  output[offset + 3] = Math.round(alpha);
};

/** Для нового метода интерполяции добавить сюда функцию и описание. */
export const interpolationMethods = {
  nearest: { label: 'Ближайший сосед', description: 'Выбирает ближайший пиксель без смешивания цветов. Подходит для пиксельной графики и чётких границ масок.', sample: nearest },
  bilinear: { label: 'Билинейная', description: 'Смешивает четыре соседних пикселя с учётом прозрачности. Даёт плавные переходы при изменении размера.', sample: bilinear },
} satisfies Record<string, { label: string; description: string; sample: Sampler }>;
export type InterpolationMethod = keyof typeof interpolationMethods;

/** Рассчитываем фрагмент в координатах полного масштабированного изображения. */
export function resizeRegion(source: Raster, width: number, height: number,
  region: { x: number; y: number; width: number; height: number }, method: InterpolationMethod = 'bilinear'): Raster {
  checkDimensions(source.width, source.height);
  checkDimensions(region.width, region.height);
  if (![width, height, region.x, region.y].every(Number.isSafeInteger) || width < 1 || height < 1
    || region.x < 0 || region.y < 0 || region.x + region.width > width || region.y + region.height > height
    || source.data.length !== source.width * source.height * 4) throw new Error('Неверная область масштабирования.');
  if (!Object.hasOwn(interpolationMethods, method)) throw new Error('Неизвестный метод интерполяции.');
  const data = new Uint8ClampedArray(region.width * region.height * 4);
  const sample = interpolationMethods[method].sample;
  for (let y = 0; y < region.height; y++) for (let x = 0; x < region.width; x++) {
    sample(source, (region.x + x + 0.5) * source.width / width - 0.5,
      (region.y + y + 0.5) * source.height / height - 0.5, data, (y * region.width + x) * 4);
  }
  return { width: region.width, height: region.height, data };
}

/** Изменение размера без canvas и CSS. Даже при совпадении размеров возвращается отдельный буфер. */
export function resizeRaster(source: Raster, width: number, height: number, method: InterpolationMethod = 'bilinear'): Raster {
  checkDimensions(source.width, source.height);
  checkDimensions(width, height);
  if (source.data.length !== source.width * source.height * 4) throw new Error('Размер массива не соответствует размерам изображения.');
  if (!Object.hasOwn(interpolationMethods, method)) throw new Error('Неизвестный метод интерполяции.');
  if (width === source.width && height === source.height) return { width, height, data: source.data.slice() };
  const data = new Uint8ClampedArray(width * height * 4);
  const sample = interpolationMethods[method].sample;
  const ratioX = source.width / width, ratioY = source.height / height;
  for (let y = 0; y < height; y++) {
    const sy = (y + 0.5) * ratioY - 0.5;
    for (let x = 0; x < width; x++) sample(source, (x + 0.5) * ratioX - 0.5, sy, data, (y * width + x) * 4);
  }
  return { width, height, data };
}
