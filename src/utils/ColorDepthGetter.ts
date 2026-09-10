import type { SupportedImageFormat } from "./ImageTypeGetter";

export async function getColorDepthOfImage(
  file: File,
  fileType: SupportedImageFormat,
): Promise<number | undefined> {
  const buffer = await file.arrayBuffer();

  if (fileType === "png") {
    return await getPNGColorDepth(buffer);
  } else if (fileType === "jpeg") {
    return await getJpegColorDepth(buffer);
  } else if (fileType === "graybit-7") {
    return getGB7ColorDepth(buffer);
  }
}

export async function getPNGColorDepth(buffer: ArrayBuffer): Promise<number> {
  const view = new DataView(buffer);

  // IHDR должен начинаться на 8 + 4 (длина) байтах
  const ihdrOffset = 8 + 4;
  const ihdrType = String.fromCharCode(
    view.getUint8(ihdrOffset),
    view.getUint8(ihdrOffset + 1),
    view.getUint8(ihdrOffset + 2),
    view.getUint8(ihdrOffset + 3),
  );

  if (ihdrType !== "IHDR") return 0;

  const dataOffset = ihdrOffset + 4; // начало данных IHDR
  const bitDepth = view.getUint8(dataOffset + 8);
  const colorType = view.getUint8(dataOffset + 9);

  let channels = 0;
  switch (colorType) {
    case 0:
      channels = 1; // grayscale
      break;
    case 2:
      channels = 3; // truecolor (rgb)
      break;
    case 3:
      channels = 1; // indexed-color (pallete)
      break;
    case 4:
      channels = 2; // grayscale with alpha
      break;
    case 6:
      channels = 4; // truecolor with alpha (RGBA)
      break;
    default:
      return 0;
  }

  return bitDepth * channels;
}

export async function getJpegColorDepth(buffer: ArrayBuffer): Promise<number> {
  const view = new DataView(buffer);

  let offset = 2; // skip SOI (Start of Image)

  while (offset < view.byteLength) {
    // Проверка маркера (всегда начинается с 0xFF)
    if (view.getUint8(offset) !== 0xff) {
      break;
    }

    const marker = view.getUint8(offset + 1);
    const length = view.getUint16(offset + 2);

    // SOF0, SOF1, SOF2 (Start Of Frame — baseline, extended sequential, progressive)
    // Их диапазон: 0xC0 - 0xCF, кроме DHT (0xC4), JPG (0xC8), DAC (0xCC)
    if (
      marker >= 0xc0 &&
      marker <= 0xcf &&
      ![0xc4, 0xc8, 0xcc].includes(marker)
    ) {
      const samplePrecision = view.getUint8(offset + 4); // bits per sample
      return samplePrecision * 3; // R, G, B — 3 компоненты
    }

    offset += 2 + length;
  }

  throw new Error("JPEG color depth not found.");
}

export function getGB7ColorDepth(buffer: ArrayBuffer): number {
  const view = new DataView(buffer);

  // Чтение флага маски
  const flag = view.getUint8(5);
  const hasMask = (flag & 0b00000001) === 1;

  // 7 битов на оттенок серого + 1 бит маски при наличии
  return hasMask ? 8 : 7;
}
