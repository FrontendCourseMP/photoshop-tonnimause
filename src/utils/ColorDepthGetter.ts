/**
 * Определение глубины цвета изображения
 * Поддерживает анализ различных форматов изображений
 */

import type { SupportedImageFormat } from "./ImageTypeGetter";

// Константы для оптимизации
const LARGE_IMAGE_THRESHOLD = 1000000; // 1M пикселей
const LARGE_IMAGE_SAMPLE_STEP = 16;
const NORMAL_IMAGE_SAMPLE_STEP = 4;
const MAX_COLORS_TO_CHECK = 10000;

/**
 * Определяет глубину цвета для изображения
 * @param file - файл изображения
 * @param format - формат изображения
 * @returns промис с глубиной цвета в битах
 */
export async function getColorDepthOfImage(
  file: File,
  format: SupportedImageFormat,
): Promise<number> {
  console.log("🎨 Начинаем определение глубины цвета...", {
    format,
    size: file.size
  });

  // Для GB7 формат всегда имеет 7-битную глубину
  if (format === "graybit-7") {
    console.log("✅ GB7 формат: глубина цвета 7 бит");
    return 7;
  }

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          console.warn("⚠️ Не удалось получить контекст canvas");
          resolve(0);
          return;
        }

        // Рисуем изображение на canvas
        ctx.drawImage(img, 0, 0);
        
        // Получаем данные изображения
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        
        // Анализируем глубину цвета
        const depth = getColorDepthFromImageData(imageData);
        
        console.log("✅ Глубина цвета определена:", depth, "бит");
        resolve(depth);
      } catch (error) {
        console.error("❌ Ошибка при определении глубины цвета:", error);
        resolve(0);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      console.error("❌ Ошибка загрузки изображения для анализа глубины цвета");
      resolve(0);
    };

    img.src = url;
  });
}

/**
 * Анализирует глубину цвета из данных изображения
 * @param imageData - данные изображения
 * @returns глубина цвета в битах
 */
function getColorDepthFromImageData(imageData: ImageData): number {
  const { data, width, height } = imageData;
  const pixelCount = width * height;
  
  console.log("🔍 Анализируем данные изображения:", {
    width,
    height,
    pixelCount
  });

  // Определяем шаг выборки в зависимости от размера изображения
  const sampleStep = pixelCount > LARGE_IMAGE_THRESHOLD 
    ? LARGE_IMAGE_SAMPLE_STEP 
    : NORMAL_IMAGE_SAMPLE_STEP;

  console.log("📊 Используем шаг выборки:", sampleStep);

  const uniqueColors = new Set<number>();
  let processedPixels = 0;

  // Анализируем пиксели с заданным шагом
  for (let i = 0; i < data.length; i += sampleStep) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    // Пропускаем полностью прозрачные пиксели
    if (a === 0) continue;

    // Используем битовую операцию для быстрого хеширования цвета
    const colorKey = (r << 16) | (g << 8) | b;
    uniqueColors.add(colorKey);
    
    processedPixels++;

    // Ограничиваем количество проверяемых цветов для производительности
    if (uniqueColors.size > MAX_COLORS_TO_CHECK) {
      console.log("⚠️ Достигнут лимит проверяемых цветов:", MAX_COLORS_TO_CHECK);
      break;
    }
  }

  const colorCount = uniqueColors.size;
  console.log("📈 Статистика анализа:", {
    uniqueColors: colorCount,
    processedPixels,
    sampleStep
  });

  if (colorCount === 0) {
    console.warn("⚠️ Не найдено уникальных цветов");
    return 0;
  }

  // Вычисляем минимальное количество бит для представления всех цветов
  const bitsNeeded = Math.ceil(Math.log2(colorCount));
  const maxBits = 24; // Максимум 24 бита (8 бит на канал RGB)
  const finalDepth = Math.min(bitsNeeded, maxBits);

  console.log("✅ Результат анализа глубины цвета:", {
    uniqueColors: colorCount,
    bitsNeeded,
    finalDepth
  });

  return finalDepth;
}

/**
 * Получает статистику цветов в изображении
 * @param imageData - данные изображения
 * @returns объект со статистикой цветов
 */
export function getColorStatistics(imageData: ImageData): {
  uniqueColors: number;
  totalPixels: number;
  transparentPixels: number;
  opaquePixels: number;
} {
  const { data, width, height } = imageData;
  const totalPixels = width * height;
  
  const uniqueColors = new Set<number>();
  let transparentPixels = 0;
  let opaquePixels = 0;

  // Анализируем каждый пиксель
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    if (a === 0) {
      transparentPixels++;
    } else {
      opaquePixels++;
      const colorKey = (r << 16) | (g << 8) | b;
      uniqueColors.add(colorKey);
    }
  }

  return {
    uniqueColors: uniqueColors.size,
    totalPixels,
    transparentPixels,
    opaquePixels,
  };
}

/**
 * Проверяет, является ли изображение монохромным
 * @param imageData - данные изображения
 * @returns true если изображение монохромное
 */
export function isMonochromeImage(imageData: ImageData): boolean {
  const { data } = imageData;
  const uniqueColors = new Set<number>();
  
  // Проверяем каждый 4-й пиксель для оптимизации
  for (let i = 0; i < data.length; i += 16) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    if (a === 0) continue;

    const colorKey = (r << 16) | (g << 8) | b;
    uniqueColors.add(colorKey);

    // Если найдено больше 2 цветов, изображение не монохромное
    if (uniqueColors.size > 2) {
      return false;
    }
  }

  return uniqueColors.size <= 2;
}