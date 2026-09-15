import { expect, it } from 'vitest';
import { pixelAtPoint, rgbToLab } from '../src/image/pipette';

it.each([
  [0, 0, 0, 0, 0, 0], [255, 255, 255, 100, 0, 0],
  [255, 0, 0, 54.29, 80.81, 69.89], [0, 255, 0, 87.82, -79.29, 80.99],
  [0, 0, 255, 29.57, 68.30, -112.03], [128, 128, 128, 53.59, 0, 0],
])('sRGB %s %s %s to Lab D50', (r, g, b, l, a, blue) => {
  const result = rgbToLab(r, g, b);
  expect(Math.abs(result.l - l)).toBeLessThan(0.02);
  expect(Math.abs(result.a - a)).toBeLessThan(0.02);
  expect(Math.abs(result.b - blue)).toBeLessThan(0.02);
});
const source = { width: 2, height: 2, data: new Uint8ClampedArray([1, 2, 3, 255, 4, 5, 6, 255, 7, 8, 9, 255, 10, 11, 12, 0]) };
it('maps scaled coordinates and preserves hidden RGB without mutation', () => {
  const before = source.data.slice();
  expect(pixelAtPoint(source, { left: -100, top: -50, width: 200, height: 100 }, 75, 25))
    .toMatchObject({ x: 1, y: 1, r: 10, g: 11, b: 12, alpha: 0 });
  expect(source.data).toEqual(before);
});
it.each([[-1, 0], [0, -1], [2, 0], [0, 2], [NaN, 1]])('rejects outside point %s %s', (x, y) => {
  expect(pixelAtPoint(source, { left: 0, top: 0, width: 2, height: 2 }, x, y)).toBeNull();
});
it('rejects a hidden canvas', () => {
  expect(pixelAtPoint(source, { left: 0, top: 0, width: 0, height: 2 }, 0, 0)).toBeNull();
});
