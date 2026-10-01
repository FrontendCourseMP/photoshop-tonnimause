import { expect, it } from 'vitest';
import { histogram } from '../src/image/histogram';
import { applyLevels, defaultLevels, type InputLevels } from '../src/image/levels';

const raster = (rgba: number[]) => ({ width: rgba.length / 4, height: 1, data: new Uint8ClampedArray(rgba) });
const grayRamp = raster(Array.from({ length: 256 }, (_, value) => [value, value, value, value]).flat());
// Независимый расчёт светлоты для проверки результата после обратного кодирования sRGB.
const lightness = (rgb: ArrayLike<number>) => [0.2126, 0.7152, 0.0722].reduce((sum, weight, index) => {
  const c = rgb[index]! / 255;
  return sum + weight * (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
}, 0);

it.each([127, 255] as const)('чёрная и белая точки совпадают со столбцом серого 128 при шкале %s', maximum => {
  const source = raster([128, 128, 128, 128]);
  const bin = maximum === 255 ? 55 : 27;
  expect(histogram(source, 'master', maximum)[bin]).toBe(1);
  expect(Array.from(applyLevels(source, { master: { black: bin, white: maximum, gamma: 1 } }, maximum, true).data))
    .toEqual([0, 0, 0, 128]);
  expect(Array.from(applyLevels(source, { master: { black: 0, white: bin, gamma: 1 } }, maximum, true).data))
    .toEqual([255, 255, 255, 128]);
  expect(Array.from(source.data)).toEqual([128, 128, 128, 128]);
});

it.each([127, 255])('нейтральный Master сохраняет все серые уровни и скрытые RGB при шкале %s', maximum => {
  const source = raster([...grayRamp.data, 255, 0, 77, 0, 12, 241, 83, 128]);
  const before = source.data.slice();
  const result = applyLevels(source, { master: defaultLevels(maximum) }, maximum, false);
  expect(result.data).toEqual(before); expect(source.data).toEqual(before);
  expect(result.data).not.toBe(source.data);
});

it.each([0.1, 0.5, 2, 9.9])('Master корректирует общую светлоту насыщенных цветов при гамме %s', gamma => {
  for (const rgb of [[255, 0, 0], [0, 255, 0], [0, 0, 255], [24, 96, 190]]) {
    const source = raster([...rgb, 123]);
    const output = applyLevels(source, { master: { black: 0, white: 255, gamma } }, 255, false).data;
    expect(Math.abs(lightness(output) - lightness(rgb) ** (1 / gamma))).toBeLessThan(0.005);
    expect(output[3]).toBe(123);
  }
});

it.each([127, 255] as const)('пороги Master отсекают весь цветной пиксель согласно гистограмме %s', maximum => {
  for (const rgb of [[255, 0, 0], [0, 255, 0], [0, 0, 255]]) {
    const source = raster([...rgb, 0]);
    const bin = Math.round(lightness(rgb) * maximum);
    expect(histogram(source, 'master', maximum)[bin]).toBe(1);
    expect(Array.from(applyLevels(source, { master: { black: bin, white: maximum, gamma: 1 } }, maximum, false).data))
      .toEqual([0, 0, 0, 0]);
    expect(Array.from(applyLevels(source, { master: { black: 0, white: bin, gamma: 1 } }, maximum, false).data))
      .toEqual([255, 255, 255, 0]);
  }
});

it.each([0.1, 1, 9.9])('соседние точки дают ступеньку без деления на ноль при гамме %s', gamma => {
  const source = raster([128, 128, 128, 13, 129, 129, 129, 17]);
  const result = applyLevels(source, { master: { black: 55, white: 56, gamma } }, 255, false);
  expect(Array.from(result.data)).toEqual([0, 0, 0, 13, 255, 255, 255, 17]);
});

it.each([
  { black: 0, white: 255, gamma: 0.1 }, { black: 0, white: 255, gamma: 9.9 },
  { black: 30, white: 180, gamma: 0.5 }, { black: 254, white: 255, gamma: 2 },
  { black: 0, white: 1, gamma: 2 },
])('серая шкала остаётся монотонной при $black $white $gamma', master => {
  const result = applyLevels(grayRamp, { master }, 255, true);
  expect(Array.from(result.data.slice(0, 4))).toEqual([0, 0, 0, 0]);
  expect(Array.from(result.data.slice(-4))).toEqual([255, 255, 255, 255]);
  for (let at = 4; at < result.data.length; at += 4) {
    expect(result.data[at]).toBeGreaterThanOrEqual(result.data[at - 4]!);
    expect(result.data[at]).toBe(result.data[at + 1]);
    expect(result.data[at + 1]).toBe(result.data[at + 2]);
    expect(result.data[at + 3]).toBe(grayRamp.data[at + 3]);
  }
});

it('отдельные каналы применяются после Master а альфа независима', () => {
  const source = raster([64, 128, 192, 128]);
  const master: InputLevels = { black: 10, white: 200, gamma: 2 };
  const red: InputLevels = { black: 20, white: 180, gamma: 0.5 };
  const alpha: InputLevels = { black: 0, white: 255, gamma: 0.5 };
  const first = applyLevels(source, { master }, 255, false);
  const sequential = applyLevels(first, { red, alpha }, 255, false);
  const together = applyLevels(source, { master, red, alpha }, 255, false);
  expect(together.data).toEqual(sequential.data);
  expect(together.data[3]).toBe(64);
});
