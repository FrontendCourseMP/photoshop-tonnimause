import type { ChannelId } from './channels';
import { checkDimensions } from './limits';
import type { Raster } from './types';

export type Padding = 'black' | 'white' | 'copy';
export type FilterOptions = { channels: readonly ChannelId[]; padding: Padding } &
  ({ mode: 'kernel'; kernel: readonly number[] } | { mode: 'median' });

export const kernelPresets = {
  identity: { label: 'Тождественное отображение', values: [0, 0, 0, 0, 1, 0, 0, 0, 0] },
  sharpen: { label: 'Повышение резкости', values: [0, -1, 0, -1, 5, -1, 0, -1, 0] },
  gaussian: { label: 'Гаусс 3 × 3', values: [1, 2, 1, 2, 4, 2, 1, 2, 1].map(value => value / 16) },
  box: { label: 'Прямоугольное размытие', values: Array<number>(9).fill(1 / 9) },
  prewittX: { label: 'Прюитт X', values: [-1, 0, 1, -1, 0, 1, -1, 0, 1] },
  prewittY: { label: 'Прюитт Y', values: [-1, -1, -1, 0, 0, 0, 1, 1, 1] },
} satisfies Record<string, { label: string; values: number[] }>;
export type KernelPreset = keyof typeof kernelPresets;

export function validateKernel(kernel: readonly number[]): void {
  if (kernel.length !== 9 || kernel.some(value => !Number.isFinite(value) || Math.abs(value) > 1000)) {
    throw new Error('Ядро должно содержать 9 конечных чисел от −1000 до 1000.');
  }
}

/** Создаём отдельный результат и обработчик строк для фонового расчёта.
 * Без браузерных API. Исходные пиксели и невыбранные каналы не изменяются.
 */
export function prepareFilter(source: Raster, options: FilterOptions) {
  checkDimensions(source.width, source.height);
  if (source.data.length !== source.width * source.height * 4) throw new Error('Неверная длина массива пикселей.');
  if (!['black', 'white', 'copy'].includes(options.padding)) throw new Error('Неизвестный способ обработки края.');
  if (!['kernel', 'median'].includes(options.mode)) throw new Error('Неизвестный фильтр.');
  if (options.channels.some(channel => !['gray', 'red', 'green', 'blue', 'alpha'].includes(channel))) throw new Error('Неизвестный канал.');
  const kernel = options.mode === 'kernel' ? [...options.kernel] : null;
  if (kernel) validateKernel(kernel);
  const selected = [0, 1, 2, 3].filter(component => options.channels.includes(
    (['red', 'green', 'blue', 'alpha'] as const)[component]!) || (component < 3 && options.channels.includes('gray')));
  const padding = options.padding;
  const result: Raster = { width: source.width, height: source.height, data: source.data.slice() };
  const read = (x: number, y: number, component: number): number => {
    if (x < 0 || y < 0 || x >= source.width || y >= source.height) {
      if (padding !== 'copy') return padding === 'white' ? 255 : 0;
      x = Math.max(0, Math.min(source.width - 1, x));
      y = Math.max(0, Math.min(source.height - 1, y));
    }
    return source.data[(y * source.width + x) * 4 + component]!;
  };
  const neighbors = new Array<number>(9);
  const renderRows = (start: number, end: number) => {
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end > source.height || end < start) {
      throw new Error('Неверный диапазон строк.');
    }
    for (let y = start; y < end; y++) for (let x = 0; x < source.width; x++) for (const component of selected) {
      let sum = 0;
      for (let i = 0; i < 9; i++) {
        const value = read(x + i % 3 - 1, y + Math.floor(i / 3) - 1, component);
        // При свёртке ядро разворачивается на 180 градусов.
        if (kernel) sum += value * kernel[8 - i]!;
        else neighbors[i] = value;
      }
      const value = kernel ? Math.round(sum) : neighbors.sort((a, b) => a - b)[4]!;
      result.data[(y * source.width + x) * 4 + component] = Math.max(0, Math.min(255, value));
    }
  };
  return { result, renderRows };
}

/** Синхронный расчёт для тестов и маленьких изображений; интерфейс использует фоновый расчёт. */
export function filterRaster(source: Raster, options: FilterOptions): Raster {
  const job = prepareFilter(source, options);
  job.renderRows(0, source.height);
  return job.result;
}
