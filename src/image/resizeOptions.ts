import { checkDimensions } from './limits';
export type ResizeUnit = 'pixels' | 'percent';
export interface Size { width: number; height: number }
export function resizeTarget(original: Size, width: string, height: string, unit: ResizeUnit): Size {
  if (!width.trim() || !height.trim()) throw new Error('Указать ширину и высоту.');
  const w = Number(width), h = Number(height);
  if (![w, h].every(value => Number.isFinite(value) && value > 0)) throw new Error('Ширина и высота должны быть положительными числами.');
  if (unit === 'pixels' && (!Number.isInteger(w) || !Number.isInteger(h))) throw new Error('Размеры в пикселях должны быть целыми.');
  if (unit === 'percent' && (w < 0.01 || h < 0.01 || w > 10000 || h > 10000)) throw new Error('Допустимый диапазон процентов — от 0,01 до 10 000.');
  const result = unit === 'pixels' ? { width: w, height: h }
    : { width: Math.round(original.width * w / 100), height: Math.round(original.height * h / 100) };
  checkDimensions(result.width, result.height);
  return result;
}
export function linkedDimension(original: Size, value: string, axis: keyof Size, unit: ResizeUnit): string | null {
  const number = Number(value);
  if (!value.trim() || !Number.isFinite(number) || number <= 0) return null;
  if (unit === 'percent') return value;
  return String(Math.max(1, Math.round(number * (axis === 'width' ? original.height / original.width : original.width / original.height))));
}
