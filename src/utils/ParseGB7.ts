/**
 * Парсер для кастомного формата GrayBit-7 (.gb7)
 * Поддерживает 7-битную глубину серого цвета с опциональной маской
 */

// Константы формата GB7
const GB7_SIGNATURE = [0x47, 0x42, 0x37, 0x1d]; // "GB7\x1D"
const GB7_HEADER_SIZE = 12;
const GB7_VERSION = 0x01;
const GB7_MASK_FLAG = 0x01;

/**
 * Интерфейс заголовка GB7 файла
 */
export interface GB7Header {
  /** Версия формата */
  version: number;
  /** Наличие маски прозрачности */
  hasMask: boolean;
  /** Ширина изображения в пикселях */
  width: number;
  /** Высота изображения в пикселях */
  height: number;
}

/**
 * Интерфейс данных GB7 файла
 */
export interface GB7Pixels {
  /** Заголовок файла */
  header: GB7Header;
  /** Массив пикселей */
  pixels: Uint8Array;
}

/**
 * Проверяет сигнатуру GB7 файла
 * @param buffer - буфер данных файла
 * @returns true если сигнатура корректна
 */
function validateGB7Signature(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < GB7_HEADER_SIZE) {
    return false;
  }

  const signature = new Uint8Array(buffer, 0, GB7_SIGNATURE.length);
  return GB7_SIGNATURE.every((byte, index) => signature[index] === byte);
}

/**
 * Парсит заголовок GB7 файла
 * @param buffer - буфер данных файла
 * @returns объект заголовка или null при ошибке
 */
function parseGB7Header(buffer: ArrayBuffer): GB7Header | null {
  if (!validateGB7Signature(buffer)) {
    console.error("❌ Неверная сигнатура GB7 файла");
    return null;
  }

  const view = new DataView(buffer);

  try {
    // Читаем версию и флаги
    const version = view.getUint8(4);
    const flags = view.getUint8(5);
    const hasMask = (flags & GB7_MASK_FLAG) === GB7_MASK_FLAG;

    // Читаем размеры (big-endian)
    const width = view.getUint16(6, false);
    const height = view.getUint16(8, false);

    // Проверяем корректность размеров
    if (width === 0 || height === 0 || width > 65535 || height > 65535) {
      console.error("❌ Некорректные размеры изображения:", width, height);
      return null;
    }

    console.log("✅ GB7 заголовок успешно прочитан:", {
      version,
      hasMask,
      width,
      height
    });

    return {
      version,
      hasMask,
      width,
      height,
    };
  } catch (error) {
    console.error("❌ Ошибка при чтении заголовка GB7:", error);
    return null;
  }
}

/**
 * Парсит пиксели GB7 файла
 * @param buffer - буфер данных файла
 * @returns объект с заголовком и пикселями или null при ошибке
 */
export function parseGB7Pixels(buffer: ArrayBuffer): GB7Pixels | null {
  console.log("🔍 Начинаем парсинг GB7 файла...");
  
  const header = parseGB7Header(buffer);
  if (!header) {
    return null;
  }

  const { width, height } = header;
  const expectedPixelsSize = width * height;
  const actualPixelsSize = buffer.byteLength - GB7_HEADER_SIZE;

  if (actualPixelsSize !== expectedPixelsSize) {
    console.error(
      "❌ Несоответствие размера данных пикселей:",
      `ожидается ${expectedPixelsSize}, получено ${actualPixelsSize}`
    );
    return null;
  }

  try {
    const pixels = new Uint8Array(buffer, GB7_HEADER_SIZE, expectedPixelsSize);
    
    console.log("✅ GB7 пиксели успешно извлечены:", {
      count: pixels.length,
      hasMask: header.hasMask
    });

    return {
      header,
      pixels,
    };
  } catch (error) {
    console.error("❌ Ошибка при извлечении пикселей GB7:", error);
    return null;
  }
}

/**
 * Конвертирует GB7 пиксели в ImageData
 * @param gb7 - объект с заголовком и пикселями GB7
 * @returns ImageData или null при ошибке
 */
export function getGB7ImageData(gb7: GB7Pixels): ImageData | null {
  const { header, pixels } = gb7;
  const { width, height, hasMask } = header;

  console.log("🎨 Конвертируем GB7 пиксели в ImageData...");

  try {
    // Создаем ImageData для результата
    const imageData = new ImageData(width, height);
    const data = imageData.data;

    // Конвертируем каждый пиксель
    for (let i = 0; i < pixels.length; i++) {
      const pixel = pixels[i];
      
      // Извлекаем 7-битное значение серого цвета
      const grayValue = (pixel & 0x7f) * 2; // Масштабируем 7 бит до 8 бит
      
      // Извлекаем маску прозрачности (если есть)
      const mask = hasMask ? (pixel & 0x80) !== 0 : true;

      const offset = i * 4;
      data[offset + 0] = grayValue;     // R
      data[offset + 1] = grayValue;     // G
      data[offset + 2] = grayValue;     // B
      data[offset + 3] = mask ? 255 : 0; // A
    }

    console.log("✅ GB7 успешно конвертирован в ImageData:", {
      width,
      height,
      hasMask
    });

    return imageData;
  } catch (error) {
    console.error("❌ Ошибка при конвертации GB7 в ImageData:", error);
    return null;
  }
}

/**
 * Сохраняет ImageData в формате GB7
 * @param imageData - данные изображения
 * @param fileName - имя файла (без расширения)
 * @param useMask - использовать маску прозрачности
 */
export async function saveGB7(
  imageData: ImageData,
  fileName: string,
  useMask: boolean = false,
): Promise<void> {
  const { width, height, data } = imageData;

  console.log("💾 Сохраняем ImageData в формате GB7...", {
    width,
    height,
    useMask
  });

  try {
    // Создаем буфер для файла
    const fileSize = GB7_HEADER_SIZE + width * height;
    const buffer = new ArrayBuffer(fileSize);
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);

    // Записываем сигнатуру
    GB7_SIGNATURE.forEach((byte, index) => {
      bytes[index] = byte;
    });

    // Записываем версию и флаги
    view.setUint8(4, GB7_VERSION);
    view.setUint8(5, useMask ? GB7_MASK_FLAG : 0x00);

    // Записываем размеры (big-endian)
    view.setUint16(6, width, false);
    view.setUint16(8, height, false);

    // Записываем зарезервированные байты
    view.setUint16(10, 0x0000, false);

    // Конвертируем и записываем пиксели
    for (let i = 0; i < width * height; i++) {
      const offset = i * 4;
      const r = data[offset + 0];
      const a = data[offset + 3];

      // Конвертируем 8-битное значение в 7-битное
      let pixel = Math.round(r / 2) & 0x7f;
      
      // Добавляем маску прозрачности (если нужно)
      if (useMask && a >= 128) {
        pixel |= 0x80;
      }

      bytes[GB7_HEADER_SIZE + i] = pixel;
    }

    // Создаем и скачиваем файл
    const blob = new Blob([buffer], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${fileName}.gb7`;
    link.click();
    URL.revokeObjectURL(url);

    console.log("✅ GB7 файл успешно сохранен:", `${fileName}.gb7`);
  } catch (error) {
    console.error("❌ Ошибка при сохранении GB7 файла:", error);
    throw error;
  }
}