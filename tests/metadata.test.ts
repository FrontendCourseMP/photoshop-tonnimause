import { describe, expect, it } from 'vitest';
import { readMetadata } from '../src/image/metadata';

// Header-only fixtures isolate metadata parsing; full decoding is tested in a browser.
function png(depth: number, colorType: number, transparency = false): ArrayBuffer {
  const data = new Uint8Array(57 + (transparency ? 14 : 0));
  const view = new DataView(data.buffer);
  data.set([137, 80, 78, 71, 13, 10, 26, 10]);
  view.setUint32(8, 13);
  data.set([73, 72, 68, 82], 12);
  view.setUint32(16, 1280); view.setUint32(20, 720);
  data[24] = depth; data[25] = colorType;
  let offset = 33;
  if (transparency) {
    view.setUint32(offset, 2); data.set([116, 82, 78, 83], offset + 4); offset += 14;
  }
  data.set([73, 68, 65, 84], offset + 4);
  data.set([73, 69, 78, 68], offset + 16);
  return data.buffer;
}

function jpeg(components: number, marker = 0xc0): ArrayBuffer {
  const data = new Uint8Array(14 + components * 3);
  const view = new DataView(data.buffer);
  data.set([0xff, 0xd8, 0xff, marker]);
  view.setUint16(4, 8 + components * 3);
  data[6] = 8; view.setUint16(7, 600); view.setUint16(9, 800); data[11] = components;
  data.set([0xff, 0xd9], data.length - 2);
  return data.buffer;
}

describe('PNG source metadata', () => {
  it.each([[1, 0, 1, 0], [8, 0, 8, 0], [16, 0, 16, 0], [8, 2, 24, 0],
    [16, 2, 48, 0], [4, 3, 4, 0], [8, 4, 8, 8], [8, 6, 24, 8], [16, 6, 48, 16]])(
    '%i-bit samples, colour type %i', (depth, type, colorBits, alphaBits) => {
      expect(readMetadata(png(depth, type))).toMatchObject({ width: 1280, height: 720, colorBits, alphaBits });
    });
  it('does not invent an alpha channel for colour-key transparency', () => {
    expect(readMetadata(png(8, 0, true))).toMatchObject({ alphaBits: 0, transparency: 'key' });
  });
  it('distinguishes palette transparency', () => {
    expect(readMetadata(png(4, 3, true))).toMatchObject({ colorBits: 4, alphaBits: 0, transparency: 'palette' });
  });
  it('rejects invalid combinations', () => { expect(() => readMetadata(png(4, 2))).toThrow(); });
  it('rejects a truncated chunk without allocating its declared size', () => {
    const buffer = png(8, 2); new DataView(buffer).setUint32(33, 0xffffffff);
    expect(() => readMetadata(buffer)).toThrow();
  });
  it('requires image data and end marker', () => {
    expect(() => readMetadata(png(8, 2).slice(0, 33))).toThrow();
  });
});

describe('JPEG source metadata', () => {
  it.each([0xc0, 0xc2])('reads baseline/progressive frame %i', marker => {
    expect(readMetadata(jpeg(3, marker))).toMatchObject({ format: 'JPEG', width: 800, height: 600, colorBits: 24, alphaBits: 0 });
  });
  it('reads grayscale without treating it as RGB', () => {
    expect(readMetadata(jpeg(1))).toMatchObject({ colorBits: 8, alphaBits: 0 });
  });
  it('does not treat the fourth colour component as alpha', () => {
    expect(readMetadata(jpeg(4))).toMatchObject({ colorBits: 32, alphaBits: 0 });
  });
  it('skips application segments before the frame', () => {
    const original = new Uint8Array(jpeg(3));
    const data = new Uint8Array(original.length + 6);
    data.set([0xff, 0xd8, 0xff, 0xe0, 0, 4, 0, 0]); data.set(original.slice(2), 8);
    expect(readMetadata(data.buffer).width).toBe(800);
  });
  it('rejects a truncated frame', () => { expect(() => readMetadata(jpeg(3).slice(0, 10))).toThrow(); });
});

it('rejects unknown and empty files', () => {
  for (const bytes of [[], [1, 2, 3], [71, 66, 55, 29]]) {
    expect(() => readMetadata(new Uint8Array(bytes).buffer)).toThrow();
  }
});
