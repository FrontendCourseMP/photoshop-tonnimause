import { detectImageFormat } from "./ImageTypeGetter";
import { getGB7ImageData, parseGB7Pixels } from "./ParseGB7";

// Загрузка стандартного изображения (PNG, JPEG)
export async function loadStandardImage(file: File): Promise<ImageData | null> {
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
        resolve(null);
        return;
      }

      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      resolve(imageData);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };

    img.src = url;
  });
}

// Загрузка GB7-изображения
export async function loadGB7Image(file: File): Promise<ImageData | null> {
  try {
    const buffer = await file.arrayBuffer();
    const imagePixels = parseGB7Pixels(buffer);

    if (!imagePixels) {
      alert(
        "Не удалось разобрать пиксели изображения. Возможно, файл поврежден.",
      );
      return null;
    }

    const imageData = await getGB7ImageData(imagePixels);
    if (!imageData) {
      alert("Не удалось загрузить изображение. Ошибка формата.");
      return null;
    }

    return imageData;
  } catch (error) {
    alert("Произошла ошибка при загрузке изображения: " + error);
    return null;
  }
} 