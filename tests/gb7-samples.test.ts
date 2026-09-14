import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { decodeGb7, encodeGb7 } from '../src/image/gb7';

const samples = [
  { name: 'vertical-kapibara.gb7', width: 1080, height: 1920, mask: false, transparent: 0 },
  { name: 'kapibara-mask.gb7', width: 1200, height: 1010, mask: true, transparent: 1185636 },
  { name: 'gradient-half-mask.gb7', width: 32, height: 32, mask: true, transparent: 512 },
];

describe.each(samples)('$name', sample => {
  const original = readFileSync(new URL(`./fixtures/gb7/${sample.name}`, import.meta.url));
  const decoded = decodeGb7(Uint8Array.from(original).buffer);
  it('reads dimensions and distinguishes mask from alpha', () => {
    expect(decoded.source).toMatchObject({ width: sample.width, height: sample.height,
      colorBits: 7, alphaBits: 0, transparency: sample.mask ? 'mask' : 'none' });
    expect(decoded.pixels.data.length).toBe(sample.width * sample.height * 4);
  });
  it('matches the expected transparency count', () => {
    let transparent = 0;
    for (let i = 3; i < decoded.pixels.data.length; i += 4) if (decoded.pixels.data[i] === 0) transparent++;
    expect(transparent).toBe(sample.transparent);
  });
  it('recreates every byte of the provided sample', () => {
    expect(Buffer.from(encodeGb7(decoded.pixels, sample.mask)).equals(original)).toBe(true);
  });
});
