type Point = { input: number; output: number };

type CorrectionParams = {
  r?: [Point, Point]; // Красный канал
  g?: [Point, Point]; // Зелёный канал
  b?: [Point, Point]; // Синий канал
  gray?: [Point, Point]; // Градационная коррекция по яркости
  alpha?: [Point, Point]; // альфа-канал
};

export function applyCurvesCorrection(
  imageData: ImageData,
  params: CorrectionParams,
): ImageData {
  const { data, width, height } = imageData;
  const result = new ImageData(width, height);

  const buildLUT = ([p1, p2]: [Point, Point]) => {
    const lut = new Uint8ClampedArray(256);
    for (let i = 0; i < 256; i++) {
      if (i <= p1.input) {
        lut[i] = p1.output;
      } else if (i >= p2.input) {
        lut[i] = p2.output;
      } else {
        const t = (i - p1.input) / (p2.input - p1.input);
        lut[i] = Math.round(p1.output + t * (p2.output - p1.output));
      }
    }
    return lut;
  };

  const lutR = params.r ? buildLUT(params.r) : null;
  const lutG = params.g ? buildLUT(params.g) : null;
  const lutB = params.b ? buildLUT(params.b) : null;
  const lutGray = params.gray ? buildLUT(params.gray) : null;
  const lutAlpha = params.alpha ? buildLUT(params.alpha) : null;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    if (lutGray) {
      const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      const corrected = lutGray[gray];
      result.data[i] = corrected;
      result.data[i + 1] = corrected;
      result.data[i + 2] = corrected;
    } else {
      result.data[i] = lutR ? lutR[r] : r;
      result.data[i + 1] = lutG ? lutG[g] : g;
      result.data[i + 2] = lutB ? lutB[b] : b;
    }

    result.data[i + 3] = lutAlpha ? lutAlpha[a] : a;
  }

  return result;
}
