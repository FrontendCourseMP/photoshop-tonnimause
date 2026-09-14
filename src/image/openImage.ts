import { readMetadata } from './metadata';
import type { ImageDocument } from './types';

// Limits apply before allocating decoded pixel buffers (4 bytes per pixel).
const MAX_FILE_BYTES = 50 * 1024 * 1024;
const MAX_PIXELS = 24_000_000;
const MAX_EDGE = 16_384;

export async function openImage(file: File): Promise<ImageDocument> {
  if (file.size > MAX_FILE_BYTES) throw new Error('Файл слишком большой. Максимальный размер — 50 МБ.');
  const buffer = await file.arrayBuffer();
  const source = readMetadata(buffer);
  if (source.width * source.height > MAX_PIXELS || Math.max(source.width, source.height) > MAX_EDGE) {
    throw new Error('Изображение слишком большое: максимум 24 Мп и 16 384 пикселя по стороне.');
  }
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(new Blob([buffer], {
      type: source.format === 'PNG' ? 'image/png' : 'image/jpeg',
    }));
  } catch {
    throw new Error('Браузер не смог открыть изображение. Возможно, файл повреждён.');
  }
  try {
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Не удалось создать холст.');
    context.drawImage(bitmap, 0, 0);
    const pixels = context.getImageData(0, 0, bitmap.width, bitmap.height);
    return { name: file.name, source, pixels };
  } finally {
    bitmap.close();
  }
}
