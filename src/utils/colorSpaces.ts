// RGB 0–255 → 0–1
function srgbToLinear(value: number): number {
  const v = value / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

export function rgbToXyz(r: number, g: number, b: number): number[] {
  const sRGBtoLinear = (c: number) => {
    c = c / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };

  const rr = sRGBtoLinear(r);
  const gg = sRGBtoLinear(g);
  const bb = sRGBtoLinear(b);

  const x = rr * 0.4124564 + gg * 0.3575761 + bb * 0.1804375;
  const y = rr * 0.2126729 + gg * 0.7151522 + bb * 0.0721750;
  const z = rr * 0.0193339 + gg * 0.1191920 + bb * 0.9503041;

  return [x * 100, y * 100, z * 100];
}

export function xyzToLab(x: number, y: number, z: number): number[] {
  const epsilon = 0.008856;
  const kappa = 903.3;

  const Xr = x / 95.047;
  const Yr = y / 100.0;
  const Zr = z / 108.883;

  const f = (t: number) =>
    t > epsilon ? Math.pow(t, 1 / 3) : (kappa * t + 16) / 116;

  const fx = f(Xr);
  const fy = f(Yr);
  const fz = f(Zr);

  const L = 116 * fy - 16;
  const a = 500 * (fx - fy);
  const b = 200 * (fy - fz);

  return [L, a, b];
}

export function rgbaToOklch(r: number, g: number, b: number) {
  // Normalize to [0,1]
  const rLin = srgbToLinear(r);
  const gLin = srgbToLinear(g);
  const bLin = srgbToLinear(b);

  // Linear RGB → LMS (OKLab intermediate)
  const l = 0.4122214708 * rLin + 0.5363325363 * gLin + 0.0514459929 * bLin;
  const m = 0.2119034982 * rLin + 0.6806995451 * gLin + 0.1073969566 * bLin;
  const s = 0.0883024619 * rLin + 0.2817188376 * gLin + 0.6299787005 * bLin;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  // LMS → OKLab
  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const A = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;

  // OKLab → OKLCH
  const C = Math.sqrt(A * A + B * B);
  let H = Math.atan2(B, A) * (180 / Math.PI);
  if (H < 0) H += 360;

  return { l: L, c: C, h: H };
}

export function getContrast(color1: number[], color2: number[]): number {
  const getLuminance = (r: number, g: number, b: number) => {
    const [rr, gg, bb] = [r, g, b].map((c) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rr + 0.7152 * gg + 0.0722 * bb;
  };

  const l1 = getLuminance(color1[0], color1[1], color1[2]);
  const l2 = getLuminance(color2[0], color2[1], color2[2]);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

// Описания цветовых пространств для тултипов
export const colorSpaceDescriptions = {
  RGB: {
    title: 'RGB (Red, Green, Blue)',
    description: 'Аддитивная цветовая модель, описывающая способ синтеза цвета для цветовоспроизведения.',
    axes: [
      { name: 'R', range: '0-255', description: 'Красный компонент' },
      { name: 'G', range: '0-255', description: 'Зеленый компонент' },
      { name: 'B', range: '0-255', description: 'Синий компонент' }
    ]
  },
  XYZ: {
    title: 'XYZ',
    description: 'Цветовое пространство, основанное на восприятии цвета человеческим глазом.',
    axes: [
      { name: 'X', range: '0-100', description: 'Условный красный' },
      { name: 'Y', range: '0-100', description: 'Яркость' },
      { name: 'Z', range: '0-100', description: 'Условный синий' }
    ]
  },
  Lab: {
    title: 'Lab',
    description: 'Цветовое пространство, разработанное для получения перцепционной равномерности.',
    axes: [
      { name: 'L', range: '0-100', description: 'Светлота' },
      { name: 'a', range: '-128 до +127', description: 'От зеленого к красному' },
      { name: 'b', range: '-128 до +127', description: 'От синего к желтому' }
    ]
  },
  OKLch: {
    title: 'OKLch',
    description: 'Перцепционно равномерное цветовое пространство, основанное на CIELAB.',
    axes: [
      { name: 'L', range: '0-1', description: 'Светлота' },
      { name: 'C', range: '0-1', description: 'Насыщенность' },
      { name: 'h', range: '0-360', description: 'Цветовой тон в градусах' }
    ]
  }
}; 