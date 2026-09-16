import { expect, it } from 'vitest';
import { fitZoom } from '../src/image/zoom';
import { resizeRaster, resizeRegion } from '../src/image/resample';

it('fits with fifty pixel margins and respects minimum scale', () => {
  expect(fitZoom(1000, 500, 600, 400)).toBe(50);
  expect(fitZoom(4000, 2000, 320, 200)).toBe(12);
  expect(fitZoom(20, 10, 1000, 800)).toBe(100);
});
it.each(['nearest', 'bilinear'] as const)('a %s tile matches its part of a full resize', method => {
  const source = { width: 2, height: 2, data: new Uint8ClampedArray([10, 20, 30, 255, 255, 0, 0, 0, 100, 80, 60, 128, 200, 150, 100, 255]) };
  const full = resizeRaster(source, 7, 9, method);
  const tile = resizeRegion(source, 7, 9, { x: 2, y: 3, width: 3, height: 2 }, method);
  for (let y = 0; y < 2; y++) expect(tile.data.slice(y * 12, (y + 1) * 12))
    .toEqual(full.data.slice(((y + 3) * 7 + 2) * 4, ((y + 3) * 7 + 5) * 4));
});
it('large virtual output allocates only a visible tile', () => {
  const source = { width: 1, height: 1, data: new Uint8ClampedArray([10, 20, 30, 255]) };
  const tile = resizeRegion(source, 49000, 49000, { x: 48000, y: 48000, width: 10, height: 10 });
  expect(tile.data.length).toBe(400);
  expect(Array.from(tile.data.slice(-4))).toEqual([10, 20, 30, 255]);
});
it('rejects out of bounds tiles', () => {
  const source = { width: 1, height: 1, data: new Uint8ClampedArray(4) };
  expect(() => resizeRegion(source, 10, 10, { x: 9, y: 0, width: 2, height: 1 })).toThrow();
});
