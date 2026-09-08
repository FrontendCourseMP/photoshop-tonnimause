// Метод ближайшего соседа
function nearestNeighbor(
  sourceData: ImageData,
  targetWidth: number,
  targetHeight: number
): ImageData {
  const sourceWidth = sourceData.width;
  const sourceHeight = sourceData.height;
  const scaleX = sourceWidth / targetWidth;
  const scaleY = sourceHeight / targetHeight;

  const targetData = new ImageData(targetWidth, targetHeight);

  for (let y = 0; y < targetHeight; y++) {
    for (let x = 0; x < targetWidth; x++) {
      // Находим ближайший пиксель в исходном изображении
      const sourceX = Math.min(Math.floor(x * scaleX), sourceWidth - 1);
      const sourceY = Math.min(Math.floor(y * scaleY), sourceHeight - 1);

      // Копируем значения RGBA
      const sourceIndex = (sourceY * sourceWidth + sourceX) * 4;
      const targetIndex = (y * targetWidth + x) * 4;

      targetData.data[targetIndex] = sourceData.data[sourceIndex];         // R
      targetData.data[targetIndex + 1] = sourceData.data[sourceIndex + 1]; // G
      targetData.data[targetIndex + 2] = sourceData.data[sourceIndex + 2]; // B
      targetData.data[targetIndex + 3] = sourceData.data[sourceIndex + 3]; // A
    }
  }

  return targetData;
}

// Билинейная интерполяция
function bilinearInterpolation(
  sourceData: ImageData,
  targetWidth: number,
  targetHeight: number
): ImageData {
  const sourceWidth = sourceData.width;
  const sourceHeight = sourceData.height;
  const scaleX = sourceWidth / targetWidth;
  const scaleY = sourceHeight / targetHeight;

  const targetData = new ImageData(targetWidth, targetHeight);

  for (let y = 0; y < targetHeight; y++) {
    for (let x = 0; x < targetWidth; x++) {
      // Находим координаты в исходном изображении
      const srcX = x * scaleX;
      const srcY = y * scaleY;

      // Находим четыре ближайших пикселя
      const x1 = Math.floor(srcX);
      const y1 = Math.floor(srcY);
      const x2 = Math.min(x1 + 1, sourceWidth - 1);
      const y2 = Math.min(y1 + 1, sourceHeight - 1);

      // Вычисляем веса для интерполяции
      const weightX = srcX - x1;
      const weightY = srcY - y1;

      // Получаем индексы пикселей
      const index11 = (y1 * sourceWidth + x1) * 4;
      const index12 = (y1 * sourceWidth + x2) * 4;
      const index21 = (y2 * sourceWidth + x1) * 4;
      const index22 = (y2 * sourceWidth + x2) * 4;

      // Интерполируем каждый канал RGBA
      for (let i = 0; i < 4; i++) {
        const value =
          sourceData.data[index11 + i] * (1 - weightX) * (1 - weightY) +
          sourceData.data[index12 + i] * weightX * (1 - weightY) +
          sourceData.data[index21 + i] * (1 - weightX) * weightY +
          sourceData.data[index22 + i] * weightX * weightY;

        targetData.data[(y * targetWidth + x) * 4 + i] = Math.round(value);
      }
    }
  }

  return targetData;
}

// Функция для выбора метода масштабирования
export async function resizeImageByMethod(
  imageData: ImageData,
  newWidth: number,
  newHeight: number,
  method: "nearest" | "bilinear"
): Promise<ImageData> {
  // Создаем временный canvas для исходного изображения
  const sourceCanvas = document.createElement("canvas");
  sourceCanvas.width = imageData.width;
  sourceCanvas.height = imageData.height;
  const sourceCtx = sourceCanvas.getContext("2d");

  if (!sourceCtx) {
    throw new Error("Failed to get source canvas context");
  }

  // Рисуем исходное изображение
  sourceCtx.putImageData(imageData, 0, 0);

  // Создаем canvas для результата
  const resultCanvas = document.createElement("canvas");
  resultCanvas.width = newWidth;
  resultCanvas.height = newHeight;
  const resultCtx = resultCanvas.getContext("2d");

  if (!resultCtx) {
    throw new Error("Failed to get result canvas context");
  }

  // Настраиваем качество интерполяции
  resultCtx.imageSmoothingEnabled = method === "bilinear";
  resultCtx.imageSmoothingQuality = "high";

  // Изменяем размер
  resultCtx.drawImage(sourceCanvas, 0, 0, newWidth, newHeight);

  // Возвращаем новые данные изображения
  return resultCtx.getImageData(0, 0, newWidth, newHeight);
} 
