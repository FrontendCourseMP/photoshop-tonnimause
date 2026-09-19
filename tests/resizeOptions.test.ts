import { expect, it } from 'vitest';
import { linkedDimension, resizeTarget } from '../src/image/resizeOptions';
const source = { width: 400, height: 200 };
it('converts percentages to final integer pixels', () => {
  expect(resizeTarget(source, '50', '150', 'percent')).toEqual({ width: 200, height: 300 });
  expect(resizeTarget(source, '33.33', '33.33', 'percent')).toEqual({ width: 133, height: 67 });
});
it('links both axes using original proportions', () => {
  expect(linkedDimension(source, '100', 'width', 'pixels')).toBe('50');
  expect(linkedDimension(source, '100', 'height', 'pixels')).toBe('200');
  expect(linkedDimension(source, '25', 'width', 'percent')).toBe('25');
  expect(linkedDimension(source, '', 'width', 'pixels')).toBeNull();
});
it.each(['', '0', '-1', '2.5', 'Infinity', 'NaN', '16385'])('rejects invalid pixel width %s', width => {
  expect(() => resizeTarget(source, width, '200', 'pixels')).toThrow();
});
it('rejects total memory limits and percentages rounding to zero', () => {
  expect(() => resizeTarget(source, '6000', '6000', 'pixels')).toThrow();
  expect(() => resizeTarget(source, '0.01', '0.01', 'percent')).toThrow();
  expect(() => resizeTarget(source, '10001', '100', 'percent')).toThrow();
});
