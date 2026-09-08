import type { SupportedImageFormat } from "./ImageTypeGetter";

export async function getColorDepthOfImage(
  file: File,
  format: SupportedImageFormat,
): Promise<number> {
  if (format === "graybit-7") {
    return 7;
  }

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(0);
        return;
      }

      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      const depth = getColorDepthFromImageData(imageData);
      resolve(depth);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(0);
    };

    img.src = url;
  });
}

function getColorDepthFromImageData(imageData: ImageData): number {
  const { data } = imageData;
  const uniqueColors = new Set<string>();

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    // Пропускаем полностью прозрачные пиксели
    if (a === 0) continue;

    uniqueColors.add(`${r},${g},${b}`);
  }

  const colorCount = uniqueColors.size;
  if (colorCount === 0) return 0;

  // Вычисляем минимальное количество бит, необходимое для представления всех цветов
  const bitsNeeded = Math.ceil(Math.log2(colorCount));
  return Math.min(bitsNeeded, 24); // Максимум 24 бита (8 бит на канал)
} 
