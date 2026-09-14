import { encodeGb7 } from './gb7';
import type { ImageDocument } from './types';

export type ExportFormat = 'png' | 'jpg' | 'gb7';
export interface ExportOptions {
  format: ExportFormat;
  quality: number;
  includeMask: boolean;
}

export function downloadName(original: string, format: ExportFormat): string {
  const stem = original.replace(/\.[^.]*$/, '').replace(/[<>:"/\\|?*]/g, '-')
    .split('').filter(char => char.charCodeAt(0) >= 32).join('').replace(/[. ]+$/, '');
  return `${stem || 'image'}.${format}`;
}

export async function encodeImage(image: ImageDocument, options: ExportOptions): Promise<Blob> {
  if (options.format === 'gb7') {
    return new Blob([encodeGb7(image.pixels, options.includeMask)], { type: 'application/octet-stream' });
  }
  const canvas = document.createElement('canvas');
  canvas.width = image.pixels.width; canvas.height = image.pixels.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Не удалось создать холст для сохранения.');
  context.putImageData(image.pixels, 0, 0);
  if (options.format === 'jpg') {
    // White is painted behind the image, preserving the current document's alpha.
    context.globalCompositeOperation = 'destination-over';
    context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height);
  }
  const mime = options.format === 'jpg' ? 'image/jpeg' : 'image/png';
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(result => result ? resolve(result) : reject(new Error('Браузер не смог сохранить изображение.')),
      mime, Math.max(0.01, Math.min(1, options.quality)));
  });
  if (blob.type !== mime) throw new Error('Браузер не поддерживает сохранение в выбранном формате.');
  return blob;
}

export function downloadBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = name;
  document.body.append(link);
  try { link.click(); } finally {
    link.remove();
    // Keep the URL alive until the browser has started consuming the download.
    window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }
}
