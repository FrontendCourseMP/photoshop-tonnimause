import { expect, it } from 'vitest';
import { applyLevels, defaultLevels, gammaAtPosition, levelsLut, midpoint, updateLevels } from '../src/image/levels';

it.each([127, 255])('identity LUT preserves every 8 bit value with maximum %s', maximum => {
  expect(Array.from(levelsLut(defaultLevels(maximum), maximum))).toEqual(Array.from({ length: 256 }, (_, i) => i));
});
it('maps black and white with clipping and gamma changes only midtones', () => {
  const lut = levelsLut({ black: 50, white: 200, gamma: 2 }, 255);
  expect(lut[49]).toBe(0); expect(lut[50]).toBe(0);
  expect(lut[200]).toBe(255); expect(lut[201]).toBe(255);
  expect(lut[125]).toBe(180);
  expect(levelsLut({ black: 50, white: 200, gamma: 0.5 }, 255)[125]).toBe(64);
});
it.each([0.1, 0.5, 1, 2, 9.9])('midpoint and gamma invert for %s', gamma => {
  const settings = { black: 40, white: 190, gamma };
  const position = midpoint(settings);
  expect(position).toBeGreaterThan(40); expect(position).toBeLessThan(190);
  expect(gammaAtPosition(settings, position)).toBeCloseTo(gamma, 8);
});
it('constrains crossing points and invalid input', () => {
  const initial = { black: 10, white: 100, gamma: 1 };
  expect(updateLevels(initial, 'black', 200, 255).black).toBe(99);
  expect(updateLevels(initial, 'white', -1, 255).white).toBe(11);
  expect(updateLevels(initial, 'gamma', 20, 255).gamma).toBe(9.9);
  expect(updateLevels(initial, 'gamma', 0, 255).gamma).toBe(0.1);
  expect(updateLevels(initial, 'black', NaN, 255)).toBe(initial);
});
it('applies master then channel and independent alpha without changing source', () => {
  const source = { width: 1, height: 1, data: new Uint8ClampedArray([64, 128, 192, 128]) };
  const result = applyLevels(source, { master: { black: 0, white: 128, gamma: 1 },
    red: { black: 128, white: 255, gamma: 1 }, alpha: { black: 0, white: 255, gamma: 0.5 } }, 255, false);
  expect(Array.from(result.data)).toEqual([0, 255, 255, 64]);
  expect(Array.from(source.data)).toEqual([64, 128, 192, 128]);
});
it('applies gray levels equally to all components', () => {
  const source = { width: 1, height: 1, data: new Uint8ClampedArray([128, 128, 128, 0]) };
  expect(Array.from(applyLevels(source, { gray: { black: 0, white: 255, gamma: 2 } }, 255, true).data)).toEqual([181, 181, 181, 0]);
});
