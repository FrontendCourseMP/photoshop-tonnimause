import { readMetadata } from './metadata';
import type { ImageDocument } from './types';
import { decodeGb7 } from './gb7';
import { checkDimensions, MAX_FILE_BYTES } from './limits';

export async function openImage(file: File): Promise<ImageDocument> {
  if (file.size > MAX_FILE_BYTES) throw new Error('Файл слишком большой. Максимальный размер — 50 МБ.');
  const buffer = await file.arrayBuffer();
  const source = readMetadata(buffer);
  checkDimensions(source.width, source.height);
  if (source.format === 'GB7') {
    const decoded = decodeGb7(buffer);
    return { name: file.name, source, pixels: new ImageData(decoded.pixels.data, source.width, source.height) };
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
    checkDimensions(bitmap.width, bitmap.height);
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
