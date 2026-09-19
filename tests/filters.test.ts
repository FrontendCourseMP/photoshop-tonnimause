import { expect, it } from 'vitest';
import { filterRaster, kernelPresets, prepareFilter, validateKernel, type FilterOptions, type Padding } from '../src/image/filters';

function raster(values: number[], width = 3) {
  return { width, height: values.length / width, data: new Uint8ClampedArray(values.flatMap(value => [value, value, value, 128])) };
}
const red = (data: Uint8ClampedArray) => Array.from(data).filter((_, index) => index % 4 === 0);
const options = (kernel: number[], padding: Padding = 'copy'): FilterOptions => ({ mode: 'kernel', kernel, padding, channels: ['red'] });

it.each(['black', 'white', 'copy'] as const)('identity with %s padding preserves every pixel including hidden colors', padding => {
  const source = raster([1, 20, 30, 40, 100, 160, 190, 200, 255]); source.data[3] = 0;
  const before = source.data.slice();
  const output = filterRaster(source, { ...options(kernelPresets.identity.values, padding), channels: ['red', 'green', 'blue', 'alpha'] });
  expect(output.data).toEqual(before); expect(output.data).not.toBe(source.data); expect(source.data).toEqual(before);
});
it.each([['black', 10], ['white', 237], ['copy', 90]] as const)('box filter on one pixel with %s padding yields %s', (padding, expected) => {
  const output = filterRaster(raster([90], 1), options(kernelPresets.box.values, padding));
  expect(Array.from(output.data)).toEqual([expected, 90, 90, 128]);
});
it('gaussian impulse has the expected weights and constant borders do not change dimensions', () => {
  const output = filterRaster(raster([0, 0, 0, 0, 160, 0, 0, 0, 0]), options(kernelPresets.gaussian.values, 'black'));
  expect(red(output.data)).toEqual([10, 20, 10, 20, 40, 20, 10, 20, 10]);
  expect([output.width, output.height]).toEqual([3, 3]);
});
it('sharpen clamps positive and negative overshoot only after accumulation', () => {
  expect(red(filterRaster(raster([0, 0, 0, 0, 100, 0, 0, 0, 0]), options(kernelPresets.sharpen.values)).data))
    .toEqual([0, 0, 0, 0, 255, 0, 0, 0, 0]);
});
it('asymmetric kernels use convolution rather than correlation', () => {
  const source = raster([10, 20, 30, 40, 50, 60, 70, 80, 90]);
  const output = filterRaster(source, options([1, 0, 0, 0, 0, 0, 0, 0, 0]));
  expect(output.data[16]).toBe(90);
});
it('Prewitt axes respond to their respective decreasing gradients', () => {
  const horizontal = raster([100, 50, 0, 100, 50, 0, 100, 50, 0]);
  expect(filterRaster(horizontal, options(kernelPresets.prewittX.values)).data[16]).toBe(255);
  expect(filterRaster(horizontal, options(kernelPresets.prewittY.values)).data[16]).toBe(0);
  const vertical = raster([100, 100, 100, 50, 50, 50, 0, 0, 0]);
  expect(filterRaster(vertical, options(kernelPresets.prewittY.values)).data[16]).toBe(255);
  expect(filterRaster(vertical, options(kernelPresets.prewittX.values)).data[16]).toBe(0);
});
it('median removes impulse noise without averaging and preserves other channels', () => {
  const source = raster([20, 20, 20, 20, 255, 20, 20, 20, 20]);
  const output = filterRaster(source, { mode: 'median', padding: 'copy', channels: ['red'] });
  expect(red(output.data)).toEqual(Array(9).fill(20));
  expect(Array.from(output.data.slice(16, 20))).toEqual([20, 255, 255, 128]);
});
it('gray processes all RGB components but alpha requires explicit selection', () => {
  const source = raster([50], 1);
  expect(Array.from(filterRaster(source, { ...options(Array(9).fill(0)), channels: ['gray'] }).data)).toEqual([0, 0, 0, 128]);
  expect(Array.from(filterRaster(source, { ...options(Array(9).fill(0)), channels: ['alpha'] }).data)).toEqual([50, 50, 50, 0]);
  expect(filterRaster(source, { ...options(Array(9).fill(0)), channels: [] }).data).toEqual(source.data);
});
it.each([1, 3])('row chunks match a complete calculation for width %s', width => {
  const source = raster([10, 20, 30, 40, 50, 60, 70, 80, 90], width);
  const config = options(kernelPresets.box.values);
  const job = prepareFilter(source, config);
  for (let row = source.height - 1; row >= 0; row--) job.renderRows(row, row + 1);
  expect(job.result).toEqual(filterRaster(source, config));
});
it.each([[], Array(8).fill(0), Array(9).fill(NaN), Array(9).fill(Infinity), Array(9).fill(1001)].map(kernel => ({ kernel })))('rejects invalid kernel $kernel', ({ kernel }) => {
  expect(() => validateKernel(kernel)).toThrow();
});
it('accepts fractional negative and zero-sum kernels without implicit normalization', () => {
  const kernel = [0, 0, 0, -0.5, 0, 0.5, 0, 0, 0];
  expect(() => validateKernel(kernel)).not.toThrow();
  const output = filterRaster(raster([100, 50, 0, 100, 50, 0, 100, 50, 0]), options(kernel));
  expect(output.data[16]).toBe(50);
});
it('rejects malformed rasters and invalid row ranges', () => {
  expect(() => filterRaster({ width: 2, height: 2, data: new Uint8ClampedArray(4) }, options(kernelPresets.identity.values))).toThrow();
  const job = prepareFilter(raster([50], 1), options(kernelPresets.identity.values));
  expect(() => job.renderRows(-1, 1)).toThrow();
  expect(() => job.renderRows(0, 2)).toThrow();
});
