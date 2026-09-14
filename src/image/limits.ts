export const MAX_FILE_BYTES = 50 * 1024 * 1024;
const MAX_PIXELS = 24_000_000;
const MAX_EDGE = 16_384;

export function checkDimensions(width: number, height: number): void {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
    throw new Error('Размеры изображения должны быть положительными целыми числами.');
  }
  if (width * height > MAX_PIXELS || Math.max(width, height) > MAX_EDGE) {
    throw new Error('Изображение слишком большое: максимум 24 Мп и 16 384 пикселя по стороне.');
  }
}
