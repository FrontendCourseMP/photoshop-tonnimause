import { checkDimensions } from './limits';
import type { ImageMetadata, Raster } from './types';

const SIGNATURE = [0x47, 0x42, 0x37, 0x1d];
const HEADER_BYTES = 12;

export function isGb7(buffer: ArrayBuffer): boolean {
  const bytes = new Uint8Array(buffer);
  return SIGNATURE.every((value, index) => bytes[index] === value);
}

export function readGb7Header(buffer: ArrayBuffer): ImageMetadata {
  if (!isGb7(buffer) || buffer.byteLength < HEADER_BYTES) throw new Error('Повреждён заголовок GB7.');
  const view = new DataView(buffer);
  if (view.getUint8(4) !== 1) throw new Error('Поддерживается только версия 1 формата GB7.');
  const flags = view.getUint8(5);
  if (flags > 1 || view.getUint16(10) !== 0) {
    throw new Error('Зарезервированные биты и байты GB7 должны быть равны нулю.');
  }
  // DataView по умолчанию использует big-endian, как требуется в задании.
  const width = view.getUint16(6);
  const height = view.getUint16(8);
  if (width === 0 || height === 0) throw new Error('Ширина и высота GB7 не могут быть равны нулю.');
  if (buffer.byteLength !== HEADER_BYTES + width * height) {
    throw new Error('Размер данных GB7 не соответствует ширине и высоте в заголовке.');
  }
  return {
    format: 'GB7', width, height, bitsPerSample: 7, colorBits: 7,
    alphaBits: 0, colorModel: 'Оттенки серого', transparency: flags === 1 ? 'mask' : 'none',
  };
}

export function decodeGb7(buffer: ArrayBuffer): { source: ImageMetadata; pixels: Raster } {
  const source = readGb7Header(buffer);
  checkDimensions(source.width, source.height);
  const bytes = new Uint8Array(buffer, HEADER_BYTES);
  const hasMask = source.transparency === 'mask';
  if (!hasMask && bytes.some(value => (value & 0x80) !== 0)) {
    throw new Error('В GB7 без маски старший бит каждого пикселя должен быть равен нулю.');
  }
  const data = new Uint8ClampedArray(bytes.length * 4);
  for (let index = 0; index < bytes.length; index++) {
    const value = bytes[index]!;
    const gray = Math.round((value & 0x7f) * 255 / 127);
    const at = index * 4;
    data[at] = gray; data[at + 1] = gray; data[at + 2] = gray;
    data[at + 3] = !hasMask || (value & 0x80) !== 0 ? 255 : 0;
  }
  return { source, pixels: { width: source.width, height: source.height, data } };
}

export function encodeGb7(pixels: Raster, includeMask: boolean): Uint8Array<ArrayBuffer> {
  const { width, height, data } = pixels;
  checkDimensions(width, height);
  if (data.length !== width * height * 4) throw new Error('Количество пикселей не соответствует размерам изображения.');
  const bytes = new Uint8Array(HEADER_BYTES + width * height);
  const view = new DataView(bytes.buffer);
  bytes.set(SIGNATURE);
  bytes[4] = 1; bytes[5] = includeMask ? 1 : 0;
  view.setUint16(6, width); view.setUint16(8, height);
  for (let index = 0; index < width * height; index++) {
    const at = index * 4;
    const alpha = data[at + 3]!;
    // Приближённая яркость по значениям RGB, без учёта цветового профиля.
    let gray = (299 * data[at]! + 587 * data[at + 1]! + 114 * data[at + 2]!) / 1000;
    if (!includeMask) gray = (gray * alpha + 255 * (255 - alpha)) / 255;
    const level = Math.round(gray * 127 / 255);
    bytes[HEADER_BYTES + index] = level | (includeMask && alpha >= 128 ? 0x80 : 0);
  }
  return bytes;
}
