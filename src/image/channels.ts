import type { ImageMetadata, Raster } from './types';

export type ChannelId = 'gray' | 'red' | 'green' | 'blue' | 'alpha';
export interface Channel { id: ChannelId; label: string }

export function imageChannels(source: ImageMetadata): Channel[] {
  const gray = source.colorModel !== 'Палитра' && source.colorBits === source.bitsPerSample;
  const channels: Channel[] = gray ? [{ id: 'gray', label: 'Серый' }] : [
    { id: 'red', label: 'Красный' }, { id: 'green', label: 'Зелёный' }, { id: 'blue', label: 'Синий' },
  ];
  if (source.transparency !== 'none') channels.push({ id: 'alpha', label:
    source.transparency === 'mask' ? 'Маска GB7' : source.alphaBits ? 'Альфа' : 'Прозрачность PNG' });
  return channels;
}

/** Просмотр не меняет исходные пиксели. Альфа отдельно отображается как непрозрачная серая маска. */
export function channelView(source: Raster, enabled: readonly ChannelId[]): Raster {
  const data = new Uint8ClampedArray(source.data.length);
  const gray = enabled.includes('gray');
  const red = gray || enabled.includes('red');
  const green = gray || enabled.includes('green');
  const blue = gray || enabled.includes('blue');
  const alpha = enabled.includes('alpha');
  const color = red || green || blue;
  for (let at = 0; at < data.length; at += 4) {
    if (!color && alpha) {
      data[at] = data[at + 1] = data[at + 2] = source.data[at + 3]!;
      data[at + 3] = 255;
    } else if (color) {
      data[at] = red ? source.data[at]! : 0;
      data[at + 1] = green ? source.data[at + 1]! : 0;
      data[at + 2] = blue ? source.data[at + 2]! : 0;
      data[at + 3] = alpha ? source.data[at + 3]! : 255;
    }
  }
  return { width: source.width, height: source.height, data };
}

/** Читаем исходный канал, включая значения, скрытые прозрачностью. */
export function channelThumbnail(source: Raster, channel: ChannelId): Raster {
  const scale = Math.min(1, 64 / source.width, 64 / source.height);
  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));
  const data = new Uint8ClampedArray(width * height * 4);
  const component = { gray: 0, red: 0, green: 1, blue: 2, alpha: 3 }[channel];
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const sx = Math.min(source.width - 1, Math.floor((x + 0.5) * source.width / width));
    const sy = Math.min(source.height - 1, Math.floor((y + 0.5) * source.height / height));
    const value = source.data[(sy * source.width + sx) * 4 + component]!;
    const at = (y * width + x) * 4;
    data[at] = data[at + 1] = data[at + 2] = value;
    data[at + 3] = 255;
  }
  return { width, height, data };
}
