import { describe, expect, it } from 'vitest';
import { channelThumbnail, channelView, imageChannels, type ChannelId } from '../src/image/channels';
import type { ImageMetadata } from '../src/image/types';

const pixels = { width: 2, height: 1, data: new Uint8ClampedArray([10, 20, 30, 0, 100, 150, 200, 128]) };
describe('channel views', () => {
  it.each([
    [['red', 'green', 'blue', 'alpha'], [10, 20, 30, 0, 100, 150, 200, 128]],
    [['red', 'blue'], [10, 0, 30, 255, 100, 0, 200, 255]],
    [['alpha'], [0, 0, 0, 255, 128, 128, 128, 255]],
    [[], [0, 0, 0, 0, 0, 0, 0, 0]],
  ])('selected %j', (channels, expected) => {
    const before = pixels.data.slice();
    const result = channelView(pixels, channels as ChannelId[]);
    expect(Array.from(result.data)).toEqual(expected);
    expect(pixels.data).toEqual(before);
    expect(result.data).not.toBe(pixels.data);
  });
  it('preserves grayscale and controls its mask separately', () => {
    const gray = { width: 1, height: 1, data: new Uint8ClampedArray([70, 70, 70, 0]) };
    expect(Array.from(channelView(gray, ['gray']).data)).toEqual([70, 70, 70, 255]);
    expect(Array.from(channelView(gray, ['gray', 'alpha']).data)).toEqual([70, 70, 70, 0]);
  });
  it.each([['red', 10, 100], ['green', 20, 150], ['blue', 30, 200], ['alpha', 0, 128]] as const)(
    'thumbnail %s is its own opaque intensity', (id, first, second) => {
      expect(Array.from(channelThumbnail(pixels, id).data)).toEqual([first, first, first, 255, second, second, second, 255]);
    });
  it('bounds previews for very tall images', () => {
    const result = channelThumbnail({ width: 1, height: 1000, data: new Uint8ClampedArray(4000) }, 'gray');
    expect([result.width, result.height]).toEqual([1, 64]);
  });
});

describe('source channels, not RGBA canvas storage', () => {
  const base: ImageMetadata = { format: 'PNG', width: 1, height: 1, bitsPerSample: 8,
    colorBits: 24, alphaBits: 0, colorModel: 'RGB', transparency: 'none' };
  it.each([
    [{}, ['red', 'green', 'blue']],
    [{ colorModel: 'Оттенки серого', colorBits: 8 }, ['gray']],
    [{ colorModel: 'Оттенки серого', colorBits: 8, alphaBits: 8, transparency: 'alpha' }, ['gray', 'alpha']],
    [{ alphaBits: 8, transparency: 'alpha' }, ['red', 'green', 'blue', 'alpha']],
    [{ colorModel: 'Палитра', colorBits: 8, transparency: 'palette' }, ['red', 'green', 'blue', 'alpha']],
    [{ colorModel: 'Оттенки серого', colorBits: 7, bitsPerSample: 7, transparency: 'mask' }, ['gray', 'alpha']],
    [{ format: 'JPEG', colorModel: '1 цветовых компонента', colorBits: 8 }, ['gray']],
  ])('metadata %j', (overrides, expected) => {
    expect(imageChannels({ ...base, ...overrides } as ImageMetadata).map(channel => channel.id)).toEqual(expected);
  });
});
