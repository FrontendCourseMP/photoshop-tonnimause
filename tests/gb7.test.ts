import { describe, expect, it } from 'vitest';
import { decodeGb7, encodeGb7, readGb7Header } from '../src/image/gb7';
import { downloadName } from '../src/image/saveImage';
import { readMetadata } from '../src/image/metadata';
import type { Raster } from '../src/image/types';

function file(values: number[], mask = false, width = values.length, height = 1): ArrayBuffer {
  const bytes = new Uint8Array(12 + values.length);
  bytes.set([0x47, 0x42, 0x37, 0x1d, 1, mask ? 1 : 0]);
  const view = new DataView(bytes.buffer);
  view.setUint16(6, width); view.setUint16(8, height); bytes.set(values, 12);
  return bytes.buffer;
}

function raster(values: number[]): Raster {
  return { width: values.length / 4, height: 1, data: new Uint8ClampedArray(values) };
}

describe('GB7 decoding', () => {
  it('identifies by signature and reports seven colour bits without alpha', () => {
    expect(readMetadata(file([0, 63, 127]))).toMatchObject({ format: 'GB7', width: 3, height: 1, colorBits: 7, alphaBits: 0, transparency: 'none' });
  });
  it('maps brightness endpoints and middle values', () => {
    expect(Array.from(decodeGb7(file([0, 63, 64, 127])).pixels.data)).toEqual([
      0, 0, 0, 255, 126, 126, 126, 255, 129, 129, 129, 255, 255, 255, 255, 255,
    ]);
  });
  it('uses the high bit for the mask while retaining hidden grayscale values', () => {
    const decoded = decodeGb7(file([0x00, 0x7f, 0x80, 0xff], true));
    expect(decoded.source).toMatchObject({ alphaBits: 0, transparency: 'mask' });
    expect(Array.from(decoded.pixels.data)).toEqual([0, 0, 0, 0, 255, 255, 255, 0, 0, 0, 0, 255, 255, 255, 255, 255]);
  });
  it('does not treat the low bit of gray as a mask', () => {
    expect(Array.from(decodeGb7(file([1])).pixels.data)).toEqual([2, 2, 2, 255]);
  });
  it('uses big endian dimensions and preserves row order', () => {
    const values = Array.from({ length: 258 * 2 }, (_, i) => i % 128);
    const decoded = decodeGb7(file(values, false, 258, 2));
    expect(decoded.source).toMatchObject({ width: 258, height: 2 });
    expect(decoded.pixels.data[258 * 4]).toBe(4);
  });
  it.each([
    [0, 0, 'signature'], [4, 2, 'version'], [5, 2, 'reserved flags'], [10, 1, 'reserved bytes'],
    [7, 0, 'zero width'], [9, 0, 'zero height'], [12, 128, 'mask disabled'],
  ])('rejects malformed %s %s %s', (offset, value) => {
    const buffer = file([1]); new Uint8Array(buffer)[Number(offset)] = Number(value);
    expect(() => decodeGb7(buffer)).toThrow();
  });
  it('rejects truncated or extra pixel data and incomplete headers', () => {
    for (const buffer of [file([1]).slice(0, 6), file([1]).slice(0, 12), file([1, 2], false, 1)]) {
      expect(() => decodeGb7(buffer)).toThrow();
    }
  });
  it('rejects unsupported dimensions before allocating RGBA', () => {
    expect(() => decodeGb7(file(Array(16385).fill(0)))).toThrow('слишком большое');
  });
});

describe('GB7 encoding', () => {
  it('writes the exact header and values independently of decoding', () => {
    const bytes = encodeGb7(raster([0, 0, 0, 255, 255, 255, 255, 255]), false);
    expect(Array.from(bytes)).toEqual([71, 66, 55, 29, 1, 0, 0, 2, 0, 1, 0, 0, 0, 127]);
  });
  it('converts red green and blue using the documented weighted sum', () => {
    expect(Array.from(encodeGb7(raster([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255]), false).slice(12))).toEqual([38, 75, 14]);
  });
  it('thresholds alpha at 128', () => {
    expect(Array.from(encodeGb7(raster([0, 0, 0, 127, 0, 0, 0, 128]), true).slice(12))).toEqual([0, 128]);
  });
  it('composites transparent and semi-transparent pixels onto white if mask is off', () => {
    expect(Array.from(encodeGb7(raster([255, 0, 0, 0, 0, 0, 0, 128]), false).slice(12))).toEqual([127, 63]);
  });
  it.each([false, true])('preserves every 7-bit value and mask on round trip mask=%s', mask => {
    const original = file(Array.from({ length: mask ? 256 : 128 }, (_, i) => i), mask);
    expect(encodeGb7(decodeGb7(original).pixels, mask)).toEqual(new Uint8Array(original));
  });
  it('supports a mask on a fully opaque image', () => {
    const bytes = encodeGb7(raster([255, 255, 255, 255]), true);
    expect(readGb7Header(bytes.buffer).transparency).toBe('mask');
    expect(bytes[12]).toBe(255);
  });
  it('does not mutate source pixels', () => {
    const image = raster([130, 67, 18, 50]); const before = image.data.slice();
    encodeGb7(image, true); encodeGb7(image, false);
    expect(image.data).toEqual(before);
  });
  it('rejects fractional zero dimensions and invalid data length', () => {
    const data = new Uint8ClampedArray(4);
    for (const [width, height] of [[0, 1], [1.5, 1], [2, 1]]) {
      expect(() => encodeGb7({ width: width!, height: height!, data }, false)).toThrow();
    }
  });
});

it.each([['photo.jpeg', 'photo.png'], ['photo.1.jpg', 'photo.1.png'], ['.jpg', 'image.png'], ['folder/name.jpg', 'folder-name.png']])(
  'uses a correct download name for %s', (original, expected) => { expect(downloadName(original, 'png')).toBe(expected); },
);
