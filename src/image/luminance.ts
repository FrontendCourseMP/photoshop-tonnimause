const linear = Float64Array.from({ length: 256 }, (_, value) => {
  const encoded = value / 255;
  return encoded <= 0.04045 ? encoded / 12.92 : ((encoded + 0.055) / 1.055) ** 2.4;
});

export function linearComponent(value: number): number { return linear[value]!; }

export function relativeLuminance(red: number, green: number, blue: number): number {
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

export function encodedComponent(value: number): number {
  const bounded = Math.max(0, Math.min(1, value));
  return Math.round(255 * (bounded <= 0.0031308 ? 12.92 * bounded : 1.055 * bounded ** (1 / 2.4) - 0.055));
}
