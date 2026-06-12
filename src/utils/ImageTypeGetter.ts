/**
 * Определение типа изображения по расширению файла и сигнатуре
 * Поддерживает форматы: JPEG, PNG, GrayBit-7
 */

// Типы поддерживаемых форматов
export type SupportedImageFormat = "jpeg" | "png" | "graybit-7";

// Сигнатуры файлов для определения типа
const FILE_SIGNATURES: Record<SupportedImageFormat, number[]> = {
  jpeg: [0xff, 0xd8, 0xff],
  png: [0x89, 0x50, 0x4e, 0x47],
  "graybit-7": [0x47, 0x42, 0x37, 0x1d],
};

// Поддерживаемые расширения файлов
const SUPPORTED_EXTENSIONS = {
  jpeg: ["jpg", "jpeg"],
  png: ["png"],
  "graybit-7": ["gb7"],
} as const;

// Максимальный размер заголовка для чтения
const MAX_HEADER_SIZE = 12;

/**
 * Определяет тип изображения по расширению файла
 * @param file - файл для анализа
 * @returns тип формата или null если не поддерживается
 */
function getImageTypeByExtension(file: File): SupportedImageFormat | null {
  const extension = file.name.split(".").pop()?.toLowerCase();
  
  if (!extension) {
    console.warn("⚠️ Файл не имеет расширения:", file.name);
    return null;
  }

  for (const [format, extensions] of Object.entries(SUPPORTED_EXTENSIONS)) {
    if ((extensions as readonly string[]).includes(extension)) {
      console.log("🔍 Определен тип по расширению:", format);
      return format as SupportedImageFormat;
    }
  }

  console.warn("⚠️ Неподдерживаемое расширение файла:", extension);
  return null;
}

/**
 * Определяет тип изображения по сигнатуре файла
 * @param buffer - буфер с заголовком файла
 * @returns тип формата или null если сигнатура не распознана
 */
function getImageTypeBySignature(buffer: ArrayBuffer): SupportedImageFormat | null {
  const bytes = new Uint8Array(buffer);

  for (const [format, signature] of Object.entries(FILE_SIGNATURES)) {
    const isMatch = signature.every((byte, index) => bytes[index] === byte);
    
    if (isMatch) {
      console.log("🔍 Определен тип по сигнатуре:", format);
      return format as SupportedImageFormat;
    }
  }

  console.warn("⚠️ Неизвестная сигнатура файла");
  return null;
}

/**
 * Определяет формат изображения по файлу
 * Проверяет как расширение, так и сигнатуру для максимальной надежности
 * @param file - файл для анализа
 * @returns промис с типом формата
 * @throws Error если формат не поддерживается или не определен
 */
export async function detectImageFormat(file: File): Promise<SupportedImageFormat> {
  console.log("🔍 Начинаем определение формата изображения...", {
    name: file.name,
    size: file.size,
    type: file.type
  });

  // Определяем тип по расширению
  const extensionType = getImageTypeByExtension(file);
  if (!extensionType) {
    throw new Error(`Неподдерживаемое расширение файла: ${file.name}`);
  }

  try {
    // Читаем заголовок файла для проверки сигнатуры
    const headerBuffer = await file.slice(0, MAX_HEADER_SIZE).arrayBuffer();
    
    // Определяем тип по сигнатуре
    const signatureType = getImageTypeBySignature(headerBuffer);
    if (!signatureType) {
      throw new Error("Сигнатура файла не соответствует ни одному известному формату");
    }

    // Проверяем соответствие расширения и сигнатуры
    if (extensionType !== signatureType) {
      throw new Error(
        `Несоответствие расширения (${extensionType}) и сигнатуры (${signatureType}) файла`
      );
    }

    console.log("✅ Формат изображения успешно определен:", signatureType);
    return signatureType;
  } catch (error) {
    console.error("❌ Ошибка при определении формата изображения:", error);
    throw error;
  }
}

/**
 * Проверяет, поддерживается ли расширение файла
 * @param fileName - имя файла
 * @returns true если расширение поддерживается
 */
export function isSupportedExtension(fileName: string): boolean {
  const extension = fileName.split(".").pop()?.toLowerCase();
  
  if (!extension) {
    return false;
  }

  const allExtensions = Object.values(SUPPORTED_EXTENSIONS).flat() as string[];
  return allExtensions.includes(extension);
}

/**
 * Получает список поддерживаемых расширений
 * @returns массив поддерживаемых расширений
 */
export function getSupportedExtensions(): string[] {
  return Object.values(SUPPORTED_EXTENSIONS).flat() as string[];
}

/**
 * Получает MIME-тип для формата
 * @param format - формат изображения
 * @returns MIME-тип или null если не поддерживается
 */
export function getMimeType(format: SupportedImageFormat): string | null {
  const mimeTypes: Record<SupportedImageFormat, string> = {
    jpeg: "image/jpeg",
    png: "image/png",
    "graybit-7": "application/octet-stream",
  };

  return mimeTypes[format] ?? null;
}