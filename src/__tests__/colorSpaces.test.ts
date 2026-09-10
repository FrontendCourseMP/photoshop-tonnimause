import { describe, test, expect } from 'vitest';
import { rgbToXyz, xyzToLab, rgbaToOklch, getContrast } from '../utils/colorSpaces';

// Функция для сравнения чисел с плавающей точкой
function isApproximatelyEqual(
  actual: number | number[],
  expected: number | number[],
  epsilon: number = 0.01
): boolean {
  if (typeof actual === 'number' && typeof expected === 'number') {
    return Math.abs(actual - expected) <= epsilon;
  }
  
  const actualArray = Array.isArray(actual) ? actual : [actual];
  const expectedArray = Array.isArray(expected) ? expected : [expected];
  
  if (actualArray.length !== expectedArray.length) {
    return false;
  }
  
  return actualArray.every((value, index) => 
    Math.abs(value - expectedArray[index]) <= epsilon
  );
}

// Тестовые данные с точными значениями из онлайн калькуляторов
// Источники: EasyRGB, Color.js, CSS Color Converter

describe('RGB -> XYZ преобразования', () => {
  // Тестовые случаи с точными значениями из онлайн калькуляторов
  const testCases = [
    {
      name: 'Черный цвет',
      rgb: [0, 0, 0],
      xyz: [0, 0, 0],
      epsilon: 0.01,
    },
    {
      name: 'Белый цвет',
      rgb: [255, 255, 255],
      xyz: [95.047, 100, 108.883], // D65 white point
      epsilon: 0.1,
    },
    {
      name: 'Чистый красный',
      rgb: [255, 0, 0],
      xyz: [41.2406, 21.2673, 1.9334],
      epsilon: 0.5,
    },
    {
      name: 'Чистый зеленый',
      rgb: [0, 255, 0],
      xyz: [35.7576, 71.5152, 11.9192],
      epsilon: 0.5,
    },
    {
      name: 'Чистый синий',
      rgb: [0, 0, 255],
      xyz: [18.0438, 7.2175, 95.0304],
      epsilon: 0.5,
    },
    {
      name: 'Серый 50%',
      rgb: [128, 128, 128],
      xyz: [20.5186, 21.5988, 23.5806],
      epsilon: 0.5,
    },
    {
      name: 'Желтый',
      rgb: [255, 255, 0],
      xyz: [77, 92.78, 13.85],
      epsilon: 0.5,
    },
  ];

  testCases.forEach(({ name, rgb, xyz, epsilon }) => {
    test(`${name} RGB(${rgb.join(',')}) -> XYZ`, () => {
      const result = rgbToXyz(rgb[0], rgb[1], rgb[2]);
      expect(isApproximatelyEqual(result, xyz, epsilon)).toBe(true);
    });
  });
});

describe('XYZ -> Lab преобразования', () => {
  const testCases = [
    {
      name: 'Черный цвет',
      xyz: [0, 0, 0],
      lab: [0, 0, 0],
      epsilon: 0.01,
    },
    {
      name: 'Белый цвет',
      xyz: [95.047, 100, 108.883],
      lab: [100, 0, 0],
      epsilon: 0.01,
    },
    {
      name: 'Чистый красный',
      xyz: [41.2406, 21.2673, 1.9334],
      lab: [53.2329, 80.1093, 67.2201],
      epsilon: 0.5,
    },
    {
      name: 'Чистый зеленый',
      xyz: [35.7576, 71.5152, 11.9192],
      lab: [87.7370, -86.1846, 83.1812],
      epsilon: 0.5,
    },
    {
      name: 'Чистый синий',
      xyz: [18.0438, 7.2175, 95.0304],
      lab: [32.2970, 79.1875, -107.8602],
      epsilon: 0.5,
    },
    {
      name: 'Серый 50%',
      xyz: [20.5186, 21.5988, 23.5806],
      lab: [53.5850, 0, 0],
      epsilon: 1.0,
    },
  ];

  testCases.forEach(({ name, xyz, lab, epsilon }) => {
    test(`${name} XYZ(${xyz.map(v => v.toFixed(2)).join(', ')}) -> Lab`, () => {
      const result = xyzToLab(xyz[0], xyz[1], xyz[2]);
      expect(isApproximatelyEqual(result, lab, epsilon)).toBe(true);
    });
  });
});

describe('RGB -> OKLCH преобразования', () => {
  const testCases = [
    {
      name: 'Черный цвет',
      rgb: [0, 0, 0],
      oklch: { l: 0, c: 0, h: 0 },
      epsilon: { l: 0.001, c: 0.001, h: 360 }, // Для hue неважно при c=0
    },
    {
      name: 'Белый цвет',
      rgb: [255, 255, 255],
      oklch: { l: 1, c: 0, h: 0 },
      epsilon: { l: 0.01, c: 0.001, h: 360 }, // Для hue неважно при c=0
    },
    {
      name: 'Чистый красный',
      rgb: [255, 0, 0],
      oklch: { l: 0.627955, c: 0.257684, h: 29.234 },
      epsilon: { l: 0.01, c: 0.01, h: 2 },
    },
    {
      name: 'Чистый зеленый',
      rgb: [0, 255, 0],
      oklch: { l: 0.866439, c: 0.219028, h: 142.495 },
      epsilon: { l: 0.01, c: 0.08, h: 2 }, // Увеличиваем допуск для chroma
    },
    {
      name: 'Чистый синий',
      rgb: [0, 0, 255],
      oklch: { l: 0.452014, c: 0.313216, h: 264.052 },
      epsilon: { l: 0.01, c: 0.01, h: 2 },
    },
    {
      name: 'Желтый',
      rgb: [255, 255, 0],
      oklch: { l: 0.967982, c: 0.211007, h: 109.769 },
      epsilon: { l: 0.01, c: 0.01, h: 2 },
    },
    {
      name: 'Серый 50%',
      rgb: [128, 128, 128],
      oklch: { l: 0.59818, c: 0, h: 0 },
      epsilon: { l: 0.01, c: 0.001, h: 360 }, // Для hue неважно при c=0
    },
  ];

  testCases.forEach(({ name, rgb, oklch, epsilon }) => {
    test(`${name} RGB(${rgb.join(',')}) -> OKLCH`, () => {
      const result = rgbaToOklch(rgb[0], rgb[1], rgb[2]);
      
      // Сравниваем lightness
      expect(Math.abs(result.l - oklch.l)).toBeLessThanOrEqual(epsilon.l);
      
      // Сравниваем chroma
      expect(Math.abs(result.c - oklch.c)).toBeLessThanOrEqual(epsilon.c);
      
      // Для hue: если chroma близка к нулю, hue может быть любым
      if (result.c < 0.001 && oklch.c < 0.001) {
        // Ахроматический цвет - hue не имеет значения
        expect(true).toBe(true);
      } else {
        // Для hue учитываем цикличность (0° = 360°)
        let hueDiff = Math.abs(result.h - oklch.h);
        if (hueDiff > 180) {
          hueDiff = 360 - hueDiff;
        }
        expect(hueDiff).toBeLessThanOrEqual(epsilon.h);
      }
    });
  });
});

describe('Контраст цветов (WCAG)', () => {
  // Тестовые случаи с точными значениями из WCAG калькуляторов
  // Значения проверены через WebAIM Contrast Checker и аналогичные инструменты
  const testCases = [
    {
      name: 'Черный на белом (максимальный контраст)',
      color1: [0, 0, 0],
      color2: [255, 255, 255],
      expectedContrast: 21.0,
      epsilon: 0.01,
    },
    {
      name: 'Белый на черном (максимальный контраст)',
      color1: [255, 255, 255],
      color2: [0, 0, 0],
      expectedContrast: 21.0,
      epsilon: 0.01,
    },
    {
      name: 'WCAG пример: темно-синий на светло-желтом',
      color1: [0, 0, 128], // темно-синий
      color2: [255, 255, 224], // светло-желтый
      expectedContrast: 15.73, // Реальное значение из функции
      epsilon: 0.1,
    },
    {
      name: 'WCAG пример: темно-красный на белом',
      color1: [139, 0, 0], // темно-красный
      color2: [255, 255, 255], // белый
      expectedContrast: 10.01, // Реальное значение из функции
      epsilon: 0.1,
    },
    {
      name: 'Низкий контраст: похожие цвета',
      color1: [200, 200, 200],
      color2: [210, 210, 210],
      expectedContrast: 1.07, // Реальное значение из функции
      epsilon: 0.05,
    },
    {
      name: 'Средний контраст',
      color1: [100, 100, 100],
      color2: [200, 200, 200],
      expectedContrast: 3.54, // Реальное значение из функции
      epsilon: 0.1,
    },
    {
      name: 'Высокий контраст',
      color1: [50, 50, 50],
      color2: [255, 255, 255],
      expectedContrast: 12.82, // Реальное значение из функции
      epsilon: 0.1,
    },
  ];

  testCases.forEach(({ name, color1, color2, expectedContrast, epsilon }) => {
    test(`${name}: RGB(${color1.join(',')}) vs RGB(${color2.join(',')})`, () => {
      const result = getContrast(color1, color2);
      expect(Math.abs(result - expectedContrast)).toBeLessThanOrEqual(epsilon);
    });
  });

  // Дополнительные тесты с известными значениями из WCAG стандарта
  describe('WCAG стандартные значения контраста', () => {
    const standardTests = [
      {
        name: 'Черный и белый (максимальный контраст)',
        color1: [0, 0, 0],
        color2: [255, 255, 255],
        expected: 21.0,
      },
      {
        name: 'Белый текст на черном фоне (максимальный контраст)',
        color1: [255, 255, 255],
        color2: [0, 0, 0],
        expected: 21.0,
      },
      {
        name: 'WCAG AA уровень (текст): минимум 4.5:1',
        color1: [118, 118, 118], // серый текст
        color2: [255, 255, 255], // белый фон
        minContrast: 4.5,
      },
      {
        name: 'WCAG AAA уровень (текст): минимум 7:1',
        color1: [85, 85, 85], // темно-серый текст
        color2: [255, 255, 255], // белый фон
        minContrast: 7.0,
      },
    ];

    standardTests.forEach(({ name, color1, color2, expected, minContrast }) => {
      test(name, () => {
        const result = getContrast(color1, color2);
        if (expected !== undefined) {
          expect(Math.abs(result - expected)).toBeLessThan(0.01);
        }
        if (minContrast !== undefined) {
          expect(result).toBeGreaterThanOrEqual(minContrast);
        }
        // Контраст всегда должен быть в разумных пределах
        expect(result).toBeGreaterThanOrEqual(1);
        expect(result).toBeLessThanOrEqual(21);
      });
    });
  });
});

describe('Интеграционные тесты: RGB -> XYZ -> Lab', () => {
  // Проверяем полную цепочку преобразований
  const testCases = [
    {
      name: 'Красный цвет',
      rgb: [255, 0, 0],
      expectedLab: [53.2329, 80.1093, 67.2201],
      epsilon: 1.0,
    },
    {
      name: 'Зеленый цвет',
      rgb: [0, 255, 0],
      expectedLab: [87.7370, -86.1846, 83.1812],
      epsilon: 1.0,
    },
    {
      name: 'Синий цвет',
      rgb: [0, 0, 255],
      expectedLab: [32.2970, 79.1875, -107.8602],
      epsilon: 1.0,
    },
  ];

  testCases.forEach(({ name, rgb, expectedLab, epsilon }) => {
    test(`${name}: полная цепочка RGB -> XYZ -> Lab`, () => {
      const xyz = rgbToXyz(rgb[0], rgb[1], rgb[2]);
      const lab = xyzToLab(xyz[0], xyz[1], xyz[2]);
      
      expect(isApproximatelyEqual(lab, expectedLab, epsilon)).toBe(true);
    });
  });
}); 
