/**
 * Утилиты для интерполяции изображений
 * Реализует методы ближайшего соседа и билинейной интерполяции
 */

// Типы для алгоритмов интерполяции
export type InterpolationMethod = 'nearest-neighbor' | 'bilinear';

// Интерфейс для параметров масштабирования
export interface ScaleParams {
  width: number;
  height: number;
  method: InterpolationMethod;
  maintainAspectRatio: boolean;
}

/**
 * Метод ближайшего соседа для интерполяции
 * @param src - исходное изображение
 * @param newWidth - ширина целевого изображения
 * @param newHeight - высота целевого изображения
 * @returns новое изображение
 */
function nearestNeighborInterpolation(
  src: ImageData,
  newWidth: number,
  newHeight: number,
): ImageData {
  const srcWidth = src.width;
  const srcHeight = src.height;
  const srcData = src.data;

  const dest = new ImageData(newWidth, newHeight);
  const destData = dest.data;

  for (let y = 0; y < newHeight; y++) {
    for (let x = 0; x < newWidth; x++) {
      const srcX = Math.round((x / newWidth) * srcWidth);
      const srcY = Math.round((y / newHeight) * srcHeight);

      const srcIndex =
        (Math.min(srcY, srcHeight - 1) * srcWidth +
          Math.min(srcX, srcWidth - 1)) *
        4;
      const destIndex = (y * newWidth + x) * 4;

      destData[destIndex + 0] = srcData[srcIndex + 0];
      destData[destIndex + 1] = srcData[srcIndex + 1];
      destData[destIndex + 2] = srcData[srcIndex + 2];
      destData[destIndex + 3] = srcData[srcIndex + 3];
    }
  }

  return dest;
}

/**
 * Билинейная интерполяция для масштабирования изображения
 * @param src - исходное изображение
 * @param newWidth - ширина целевого изображения
 * @param newHeight - высота целевого изображения
 * @returns новое изображение
 */
function bilinearInterpolation(
  src: ImageData,
  newWidth: number,
  newHeight: number,
): ImageData {
  const srcWidth = src.width;
  const srcHeight = src.height;
  const srcData = src.data;

  const dest = new ImageData(newWidth, newHeight);
  const destData = dest.data;

  for (let y = 0; y < newHeight; y++) {
    const srcY = (y / newHeight) * (srcHeight - 1);
    const y0 = Math.floor(srcY);
    const y1 = Math.min(y0 + 1, srcHeight - 1);
    const yLerp = srcY - y0;

    for (let x = 0; x < newWidth; x++) {
      const srcX = (x / newWidth) * (srcWidth - 1);
      const x0 = Math.floor(srcX);
      const x1 = Math.min(x0 + 1, srcWidth - 1);
      const xLerp = srcX - x0;

      const i00 = (y0 * srcWidth + x0) * 4;
      const i10 = (y0 * srcWidth + x1) * 4;
      const i01 = (y1 * srcWidth + x0) * 4;
      const i11 = (y1 * srcWidth + x1) * 4;

      const destIndex = (y * newWidth + x) * 4;

      for (let c = 0; c < 4; c++) {
        const top = srcData[i00 + c] * (1 - xLerp) + srcData[i10 + c] * xLerp;
        const bottom =
          srcData[i01 + c] * (1 - xLerp) + srcData[i11 + c] * xLerp;
        destData[destIndex + c] = top * (1 - yLerp) + bottom * yLerp;
      }
    }
  }

  return dest;
}

/**
 * Основная функция масштабирования изображения
 * @param sourceImage - исходное изображение
 * @param params - параметры масштабирования
 * @returns новое изображение
 */
export function scaleImage(sourceImage: ImageData, params: ScaleParams): ImageData {
  console.log("🔄 Начинаем масштабирование изображения:", params);
  
  // Вычисляем размеры с учетом пропорций
  let { width, height } = params;
  
  if (params.maintainAspectRatio) {
    const aspectRatio = sourceImage.width / sourceImage.height;
    if (width / height > aspectRatio) {
      width = Math.round(height * aspectRatio);
    } else {
      height = Math.round(width / aspectRatio);
    }
  }
  
  console.log(`📏 Финальные размеры: ${width}x${height}`);
  
  // Применяем выбранный метод интерполяции
  switch (params.method) {
    case 'nearest-neighbor':
      return nearestNeighborInterpolation(sourceImage, width, height);
    case 'bilinear':
      return bilinearInterpolation(sourceImage, width, height);
    default:
      console.warn("⚠️ Неизвестный метод интерполяции, используем билинейную");
      return bilinearInterpolation(sourceImage, width, height);
  }
}

/**
 * Вычисляет количество мегапикселей
 * @param width - ширина
 * @param height - высота
 * @returns количество мегапикселей
 */
export function calculateMegapixels(width: number, height: number): number {
  return Math.round((width * height) / 1000000 * 100) / 100;
}

/**
 * Валидация параметров масштабирования
 * @param params - параметры для валидации
 * @returns объект с результатами валидации
 */
export function validateScaleParams(params: ScaleParams): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (params.width <= 0) {
    errors.push("Ширина должна быть больше 0");
  }
  
  if (params.height <= 0) {
    errors.push("Высота должна быть больше 0");
  }
  
  if (params.width > 10000) {
    errors.push("Ширина не должна превышать 10000 пикселей");
  }
  
  if (params.height > 10000) {
    errors.push("Высота не должна превышать 10000 пикселей");
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}