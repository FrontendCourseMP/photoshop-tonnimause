import { expect, it } from 'vitest';
import { resizeRaster, type InterpolationMethod } from '../src/image/resample';
const row = { width: 2, height: 1, data: new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, 255]) };
const redValues = (data: Uint8ClampedArray) => Array.from(data).filter((_, i) => i % 4 === 0);

it('nearest enlargement uses pixel centers', () => {
  expect(redValues(resizeRaster(row, 4, 1, 'nearest').data)).toEqual([0, 0, 255, 255]);
});
it('bilinear is default and interpolates centers with clamped edges', () => {
  expect(redValues(resizeRaster(row, 4, 1).data)).toEqual([0, 64, 191, 255]);
});
it('bilinear reduction to one pixel averages four corners', () => {
  const source = { width: 2, height: 2, data: new Uint8ClampedArray([0, 0, 0, 255, 80, 40, 0, 255, 160, 80, 0, 255, 240, 120, 0, 255]) };
  expect(Array.from(resizeRaster(source, 1, 1).data)).toEqual([120, 60, 0, 255]);
  expect(Array.from(resizeRaster(source, 1, 1, 'nearest').data)).toEqual([240, 120, 0, 255]);
});
it('transparent color does not contaminate an opaque neighbor', () => {
  const source = { width: 2, height: 1, data: new Uint8ClampedArray([255, 0, 0, 255, 0, 0, 255, 0]) };
  expect(Array.from(resizeRaster(source, 1, 1).data)).toEqual([255, 0, 0, 128]);
});
it('fully transparent interpolation is finite and black', () => {
  const source = { width: 2, height: 1, data: new Uint8ClampedArray([255, 0, 0, 0, 0, 255, 0, 0]) };
  expect(Array.from(resizeRaster(source, 1, 1).data)).toEqual([0, 0, 0, 0]);
});
it.each(['nearest', 'bilinear'] as const)('%s identity preserves hidden colors and does not alias input', method => {
  const source = { width: 1, height: 1, data: new Uint8ClampedArray([1, 2, 3, 0]) };
  const result = resizeRaster(source, 1, 1, method);
  expect(result.data).toEqual(source.data); expect(result.data).not.toBe(source.data);
  result.data[0] = 99; expect(source.data[0]).toBe(1);
});
it.each(['nearest', 'bilinear'] as const)('%s handles a single column and nonuniform scaling', method => {
  const source = { width: 1, height: 2, data: row.data.slice() };
  const before = source.data.slice();
  const result = resizeRaster(source, 3, 4, method);
  expect(redValues(result.data)).toEqual(method === 'nearest'
    ? [0, 0, 0, 0, 0, 0, 255, 255, 255, 255, 255, 255]
    : [0, 0, 0, 64, 64, 64, 191, 191, 191, 255, 255, 255]);
  expect(source.data).toEqual(before);
});
it.each([[0, 1], [-1, 1], [1.5, 2], [NaN, 1], [1, Infinity], [16385, 1], [6000, 6000]])('rejects dimensions %s %s before allocation', (w, h) => {
  expect(() => resizeRaster(row, w, h)).toThrow();
});
it('rejects malformed source buffers and unknown methods', () => {
  expect(() => resizeRaster({ ...row, data: new Uint8ClampedArray(3) }, 4, 4)).toThrow();
  expect(() => resizeRaster(row, 4, 4, 'unknown' as InterpolationMethod)).toThrow();
});
