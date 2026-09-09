export function imageDataToGB7(
  imageData: ImageData,
  useMask = false,
): Uint8Array {
  const { width, height, data } = imageData;
  const pixelCount = width * height;

  // Заголовок
  const header = new Uint8Array(12);
  header.set([0x47, 0x42, 0x37, 0x1d]); // "GB7·"
  header[4] = 0x01; // Версия
  header[5] = useMask ? 0x01 : 0x00; // Флаг маски
  header[6] = (width >> 8) & 0xff; // Ширина: старший байт
  header[7] = width & 0xff; // Ширина: младший байт
  header[8] = (height >> 8) & 0xff; // Высота: старший байт
  header[9] = height & 0xff; // Высота: младший байт
  header[10] = 0x00; // Зарезервировано
  header[11] = 0x00;

  // Данные пикселей
  const pixels = new Uint8Array(pixelCount);

  for (let i = 0; i < pixelCount; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    const a = data[i * 4 + 3];

    // Конвертируем в оттенок серого (можно выбрать другую формулу)
    const gray = Math.round((r + g + b) / 3); // 0–255
    const gray7bit = gray >> 1; // 0–127 (7 бит)

    if (useMask) {
      const maskBit = a > 0 ? 0b10000000 : 0;
      pixels[i] = gray7bit | maskBit;
    } else {
      pixels[i] = gray7bit;
    }
  }

  // Объединяем заголовок и данные
  const result = new Uint8Array(header.length + pixels.length);
  result.set(header, 0);
  result.set(pixels, header.length);

  return result;
}

export function saveGB7(
  imageData: ImageData,
  fileName: string,
  useMask = false,
) {
  const gb7Data = imageDataToGB7(imageData, useMask);
  const blob = new Blob([new Uint8Array(gb7Data.buffer as ArrayBuffer)], {
  type: "application/octet-stream",
  });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `${fileName}.gb7`;
  a.click();
  URL.revokeObjectURL(url);
}
