import { describe, test, expect } from 'vitest';
import { rgbToXyz, xyzToLab, rgbaToOklch, getContrast } from '../utils/colorSpaces';

// Тестовые данные для цветовых преобразований
const testColors = [
  [202, 208, 42],
  [110, 99, 105],
  [234, 99, 106],
  [249, 234, 224],
  [95, 96, 153],
  [232, 183, 130],
  [191, 153, 130],
  [141, 170, 112],
] as const;

type ColorKey = typeof testColors[number][0] extends number
  ? `${typeof testColors[number][0]}-${typeof testColors[number][1]}-${typeof testColors[number][2]}`
  : never;

type ExpectedResults = {
  [K in ColorKey]: {
    xyz: number[];
    lab: number[];
    oklch: number[];
  };
};

const expectedResults: ExpectedResults = {
  "202-208-42": {
    xyz: [47, 58, 11],
    lab: [81, -22, 74],
    oklch: [0.83, 0.17, 111.83],
  },
  "110-99-105": {
    xyz: [13, 13, 15],
    lab: [43, 4, -2],
    oklch: [0.51, 0.02, 343.63],
  },
  "234-99-106": {
    xyz: [41, 27, 17],
    lab: [59, 55, 22],
    oklch: [0.67, 0.17, 19.67],
  },
  "249-234-224": {
    xyz: [82, 84, 82],
    lab: [93, 4, 7],
    oklch: [0.95, 0.02, 56.13],
  },
  "95-96-153": {
    xyz: [15, 13, 32],
    lab: [43, 17, -32],
    oklch: [0.51, 0.09, 282],
  },
  "232-183-130": {
    xyz: [54, 53, 28],
    lab: [78, 9, 35],
    oklch: [0.81, 0.09, 68.23],
  },
  "191-153-130": {
    xyz: [37, 35, 26],
    lab: [66, 13, 17],
    oklch: [0.71, 0.06, 52.74],
  },
  "141-170-112": {
    xyz: [28, 36, 21],
    lab: [67, -23, 27],
    oklch: [0.7, 0.09, 129.98],
  },
};

// Тестовые данные для контраста
const contrastTestCases = [
  {
    color1: [0, 0, 0],
    color2: [255, 255, 255],
    contrast: 21,
  },
  {
    color1: [89, 153, 241],
    color2: [111, 153, 32],
    contrast: 1.16,
  },
  {
    color1: [232, 208, 188],
    color2: [50, 15, 11],
    contrast: 11.73,
  },
  {
    color1: [71, 69, 83],
    color2: [251, 182, 136],
    contrast: 5.41,
  },
  {
    color1: [90, 60, 62],
    color2: [253, 250, 240],
    contrast: 9.35,
  },
  {
    color1: [254, 213, 133],
    color2: [136, 40, 33],
    contrast: 6.35,
  },
  {
    color1: [208, 155, 169],
    color2: [180, 48, 119],
    contrast: 2.46,
  },
];

// Функция для сравнения чисел с плавающей точкой
function isApproximatelyEqual(actual: number[], expected: number[], epsilon: number = 5): boolean {
  return actual.length === expected.length &&
    actual.every((value, index) => Math.abs(value - expected[index]) <= epsilon);
}

describe('Цветовые преобразования', () => {
  testColors.forEach((rgb) => {
    const key = rgb.join('-') as ColorKey;
    const expected = expectedResults[key];

    test(`RGB(${rgb.join(',')}) -> XYZ`, () => {
      const result = rgbToXyz(rgb[0], rgb[1], rgb[2]);
      const roundedResult = result.map(Math.round);
      expect(isApproximatelyEqual(roundedResult, expected.xyz, 5)).toBe(true);
    });

    test(`RGB(${rgb.join(',')}) -> Lab`, () => {
      const xyz = rgbToXyz(rgb[0], rgb[1], rgb[2]);
      const result = xyzToLab(xyz[0], xyz[1], xyz[2]);
      const roundedResult = result.map(Math.round);
      expect(isApproximatelyEqual(roundedResult, expected.lab, 5)).toBe(true);
    });

    test(`RGB(${rgb.join(',')}) -> OKLch`, () => {
      const result = rgbaToOklch(rgb[0], rgb[1], rgb[2]);
      const resultArray = [result.l, result.c, result.h];
      console.log('Test case:', rgb.join(','));
      console.log('Expected:', expected.oklch);
      console.log('Got:', resultArray);
      console.log('Differences:', resultArray.map((v, i) => Math.abs(v - expected.oklch[i])));
      expect(isApproximatelyEqual(resultArray, expected.oklch, 5)).toBe(true);
    });
  });
});

describe('Контраст цветов', () => {
  contrastTestCases.forEach(({ color1, color2, contrast }, index) => {
    test(`Тест контраста #${index + 1}`, () => {
      const result = getContrast(color1, color2);
      expect(Math.abs(result - contrast)).toBeLessThan(0.1);
    });
  });
}); 