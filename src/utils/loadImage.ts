/**
 * Загрузка и обработка изображений различных форматов
 * Поддерживает стандартные форматы (PNG, JPEG) и кастомный GrayBit-7
 */

import { getGB7ImageData, parseGB7Pixels } from "./ParseGB7";

// Константы для оптимизации
const MAX_IMAGE_SIZE = 2048; // Максимальный размер для оптимизации
const CANVAS_OPTIONS = {
  alpha: true,
  desynchronized: true, // Оптимизация для производительности
} as const;

/**
 * Загружает стандартное изображение (PNG, JPEG) и конвертирует в ImageData
 * @param file - файл изображения
 * @returns промис с данными изображения или null при ошибке
 */
export async function loadStandardImage(file: File): Promise<ImageData | null> {
  console.log("🖼️ Начинаем загрузку стандартного изображения...", {
    name: file.name,
    size: file.size,
    type: file.type
  });

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    // Настройки для быстрой загрузки
    img.crossOrigin = "anonymous";

    img.onload = () => {
      URL.revokeObjectURL(url);
      
      try {
        console.log("✅ Изображение загружено:", {
          width: img.width,
          height: img.height
        });

        // Оптимизируем размер для больших изображений
        const { width, height } = optimizeImageSize(img.width, img.height);
        
        console.log("📏 Оптимизированные размеры:", { width, height });

        // Создаем canvas для конвертации
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d", CANVAS_OPTIONS);
        if (!ctx) {
          console.error("❌ Не удалось получить контекст canvas");
          resolve(null);
          return;
        }

        // Проверяем, что это CanvasRenderingContext2D
        if (ctx instanceof CanvasRenderingContext2D) {
          // Настройки рендеринга для лучшего качества
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
        }

        // Рисуем изображение на canvas
        if (ctx instanceof CanvasRenderingContext2D) {
          ctx.drawImage(img, 0, 0, width, height);
          
          // Получаем данные изображения
          const imageData = ctx.getImageData(0, 0, width, height);
          
          console.log("✅ Стандартное изображение успешно обработано");
          resolve(imageData);
        } else {
          console.error("❌ Неверный тип контекста canvas");
          resolve(null);
        }
      } catch (error) {
        console.error("❌ Ошибка при обработке стандартного изображения:", error);
        resolve(null);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      console.error("❌ Ошибка загрузки изображения");
      resolve(null);
    };

    img.src = url;
  });
}

/**
 * Загружает GB7 изображение и конвертирует в ImageData
 * @param file - файл GB7
 * @returns промис с данными изображения или null при ошибке
 */
export async function loadGB7Image(file: File): Promise<ImageData | null> {
  console.log("🔧 Начинаем загрузку GB7 изображения...", {
    name: file.name,
    size: file.size
  });

  try {
    // Читаем файл как ArrayBuffer
    const buffer = await file.arrayBuffer();
    console.log("📦 Буфер файла прочитан:", buffer.byteLength, "байт");

    // Парсим пиксели GB7
    const imagePixels = parseGB7Pixels(buffer);
    if (!imagePixels) {
      console.error("❌ Не удалось разобрать пиксели GB7");
      return null;
    }

    console.log("✅ GB7 пиксели успешно распарсены:", {
      width: imagePixels.header.width,
      height: imagePixels.header.height,
      hasMask: imagePixels.header.hasMask
    });

    // Конвертируем в ImageData
    const imageData = getGB7ImageData(imagePixels);
    if (!imageData) {
      console.error("❌ Не удалось конвертировать GB7 в ImageData");
      return null;
    }

    console.log("✅ GB7 изображение успешно загружено");
    return imageData;
  } catch (error) {
    console.error("❌ Ошибка при загрузке GB7 изображения:", error);
    return null;
  }
}

/**
 * Оптимизирует размер изображения для производительности
 * @param originalWidth - оригинальная ширина
 * @param originalHeight - оригинальная высота
 * @returns оптимизированные размеры
 */
function optimizeImageSize(originalWidth: number, originalHeight: number): { width: number; height: number } {
  // Если изображение меньше максимального размера, возвращаем оригинальные размеры
  if (originalWidth <= MAX_IMAGE_SIZE && originalHeight <= MAX_IMAGE_SIZE) {
    return { width: originalWidth, height: originalHeight };
  }

  // Вычисляем масштаб для вписывания в максимальный размер
  const scale = Math.min(MAX_IMAGE_SIZE / originalWidth, MAX_IMAGE_SIZE / originalHeight);
  
  return {
    width: Math.floor(originalWidth * scale),
    height: Math.floor(originalHeight * scale),
  };
}

/**
 * Создает превью изображения заданного размера
 * @param imageData - данные изображения
 * @param maxSize - максимальный размер превью
 * @returns данные превью изображения
 */
export function createImagePreview(imageData: ImageData, maxSize: number = 200): ImageData {
  const { width, height } = imageData;
  
  // Вычисляем масштаб для превью
  const scale = Math.min(maxSize / width, maxSize / height);
  const previewWidth = Math.floor(width * scale);
  const previewHeight = Math.floor(height * scale);

  // Создаем canvas для превью
  const canvas = document.createElement("canvas");
  canvas.width = previewWidth;
  canvas.height = previewHeight;

  const ctx = canvas.getContext("2d", CANVAS_OPTIONS);
  if (!ctx) {
    throw new Error("Не удалось создать контекст canvas для превью");
  }

  // Создаем временный canvas с оригинальным изображением
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tempCtx = tempCanvas.getContext("2d");
  
  if (!tempCtx) {
    throw new Error("Не удалось создать временный контекст canvas");
  }

  tempCtx.putImageData(imageData, 0, 0);

  // Проверяем типы контекстов
  if (ctx instanceof CanvasRenderingContext2D) {
    // Настройки сглаживания
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // Рисуем масштабированное изображение
    ctx.drawImage(tempCanvas, 0, 0, width, height, 0, 0, previewWidth, previewHeight);

    return ctx.getImageData(0, 0, previewWidth, previewHeight);
  } else {
    throw new Error("Неверный тип контекста canvas");
  }
}

/**
 * Проверяет, является ли изображение слишком большим для обработки
 * @param width - ширина изображения
 * @param height - высота изображения
 * @returns true если изображение слишком большое
 */
export function isImageTooLarge(width: number, height: number): boolean {
  const pixelCount = width * height;
  const maxPixels = 16 * 1024 * 1024; // 16 мегапикселей
  
  return pixelCount > maxPixels;
}

/**
 * Получает информацию о размере изображения
 * @param imageData - данные изображения
 * @returns объект с информацией о размере
 */
export function getImageSizeInfo(imageData: ImageData): {
  width: number;
  height: number;
  pixelCount: number;
  isLarge: boolean;
  estimatedMemoryUsage: number;
} {
  const { width, height } = imageData;
  const pixelCount = width * height;
  const isLarge = isImageTooLarge(width, height);
  const estimatedMemoryUsage = pixelCount * 4; // 4 байта на пиксель (RGBA)

  return {
    width,
    height,
    pixelCount,
    isLarge,
    estimatedMemoryUsage,
  };
}