import { expect, it } from 'vitest';
import { histogram, histogramHeights, type LevelsChannel } from '../src/image/histogram';

const source = { width: 4, height: 1, data: new Uint8ClampedArray([255, 0, 0, 0, 0, 255, 0, 128, 0, 0, 255, 255, 128, 128, 128, 255]) };
it('uses linear relative luminance, including transparent colors', () => {
  const before = source.data.slice();
  const bins = histogram(source, 'master', 255);
  for (const index of [54, 182, 18, 55]) expect(bins[index]).toBe(1);
  expect(bins.reduce((a, b) => a + b)).toBe(4);
  expect(source.data).toEqual(before);
});
it.each(['red', 'green', 'blue', 'alpha'] as LevelsChannel[])('counts %s components without weighting', channel => {
  const bins = histogram(source, channel, 255);
  expect(bins.reduce((a, b) => a + b)).toBe(4);
  expect(bins[128]).toBe(1);
  expect(bins[255]).toBe(channel === 'alpha' ? 2 : 1);
});
it('recovers all 128 gray levels of GB7', () => {
  const data = new Uint8ClampedArray(128 * 4);
  for (let i = 0; i < 128; i++) data.set([Math.round(i * 255 / 127), 0, 0, 255], i * 4);
  expect(Array.from(histogram({ width: 128, height: 1, data }, 'gray', 127))).toEqual(Array(128).fill(1));
});
it('log scale changes heights but not counts and handles empty bins', () => {
  const bins = new Uint32Array([0, 1, 100]);
  expect(histogramHeights(bins, 'linear')).toEqual([0, 0.01, 1]);
  expect(histogramHeights(bins, 'log')[1]).toBeCloseTo(Math.log(2) / Math.log(101));
  expect(Array.from(bins)).toEqual([0, 1, 100]);
  expect(histogramHeights(new Uint32Array(128), 'log')).toEqual(Array(128).fill(0));
});
