import type { ImageMetadata } from './types';
import { isGb7, readGb7Header } from './gb7';

const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10];
const frameMarkers = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
const invalid = () => new Error('Файл повреждён: не удалось прочитать сведения об изображении.');

export function readMetadata(buffer: ArrayBuffer): ImageMetadata {
  if (isGb7(buffer)) return readGb7Header(buffer);
  const bytes = new Uint8Array(buffer);
  if (pngSignature.every((value, i) => bytes[i] === value)) return readPng(buffer);
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return readJpeg(buffer);
  throw new Error('Формат не поддерживается. Выбрать файл PNG, JPG или GB7.');
}

function readPng(buffer: ArrayBuffer): ImageMetadata {
  const view = new DataView(buffer);
  let offset = 8;
  let metadata: ImageMetadata | undefined;
  let hasPixels = false;
  while (offset + 12 <= view.byteLength) {
    const length = view.getUint32(offset);
    if (length > view.byteLength - offset - 12) throw invalid();
    const type = String.fromCharCode(...new Uint8Array(buffer, offset + 4, 4));
    const data = offset + 8;
    if (!metadata && type !== 'IHDR') throw invalid();
    if (type === 'IHDR') {
      if (metadata || length !== 13) throw invalid();
      const width = view.getUint32(data);
      const height = view.getUint32(data + 4);
      const depth = view.getUint8(data + 8);
      const colorType = view.getUint8(data + 9);
      const models: Record<number, { name: string; channels: number; alpha: boolean; depths: number[] }> = {
        0: { name: 'Оттенки серого', channels: 1, alpha: false, depths: [1, 2, 4, 8, 16] },
        2: { name: 'RGB', channels: 3, alpha: false, depths: [8, 16] },
        3: { name: 'Палитра', channels: 1, alpha: false, depths: [1, 2, 4, 8] },
        4: { name: 'Оттенки серого', channels: 1, alpha: true, depths: [8, 16] },
        6: { name: 'RGB', channels: 3, alpha: true, depths: [8, 16] },
      };
      const model = models[colorType];
      if (!width || !height || !model || !model.depths.includes(depth)
        || view.getUint8(data + 10) !== 0 || view.getUint8(data + 11) !== 0
        || view.getUint8(data + 12) > 1) throw invalid();
      metadata = {
        format: 'PNG', width, height, bitsPerSample: depth,
        colorBits: depth * model.channels, alphaBits: model.alpha ? depth : 0,
        colorModel: model.name, transparency: model.alpha ? 'alpha' : 'none',
      };
    } else if (type === 'tRNS') {
      if (!metadata || hasPixels || metadata.alphaBits) throw invalid();
      metadata.transparency = metadata.colorModel === 'Палитра' ? 'palette' : 'key';
    } else if (type === 'IDAT') {
      hasPixels = true;
    } else if (type === 'IEND') {
      if (!metadata || !hasPixels || length !== 0 || offset + 12 !== view.byteLength) throw invalid();
      return metadata;
    }
    offset += length + 12;
  }
  throw invalid();
}

function readJpeg(buffer: ArrayBuffer): ImageMetadata {
  const view = new DataView(buffer);
  let offset = 2;
  while (offset < view.byteLength) {
    if (view.getUint8(offset++) !== 0xff) throw invalid();
    while (offset < view.byteLength && view.getUint8(offset) === 0xff) offset++;
    if (offset >= view.byteLength) throw invalid();
    const marker = view.getUint8(offset++);
    if (marker === 0xda || marker === 0xd9) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > view.byteLength) throw invalid();
    const length = view.getUint16(offset);
    if (length < 2 || offset + length > view.byteLength) throw invalid();
    if (frameMarkers.has(marker)) {
      if (length < 8) throw invalid();
      const depth = view.getUint8(offset + 2);
      const height = view.getUint16(offset + 3);
      const width = view.getUint16(offset + 5);
      const components = view.getUint8(offset + 7);
      if (!width || !height || ![8, 12, 16].includes(depth)
        || ![1, 3, 4].includes(components) || length !== 8 + 3 * components) throw invalid();
      return {
        format: 'JPEG', width, height, bitsPerSample: depth,
        colorBits: depth * components, alphaBits: 0, transparency: 'none',
        colorModel: components === 1 ? 'Оттенки серого' : `${components} цветовых компонента`,
      };
    }
    offset += length;
  }
  throw invalid();
}
