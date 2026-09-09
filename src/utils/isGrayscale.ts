/** Проверяет, является ли изображение градаций серого */
export function isGrayscaleImage(imageData: ImageData): boolean {
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i],
      g = data[i + 1],
      b = data[i + 2];
    if (r !== g || r !== b) {
      return false;
    }
  }
  return true;
}
