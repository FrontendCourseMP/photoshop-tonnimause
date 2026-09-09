type Channel = "R" | "G" | "B" | "A";

/**
 * Создает гистограмму для одного канала (R, G, B, A) из imageData.
 */
export function getChannelHistogram(
  imageData: ImageData,
  channel: Channel,
): number[] {
  const histogram = new Array(256).fill(0);
  const data = imageData.data;
  const channelIndex = { R: 0, G: 1, B: 2, A: 3 }[channel];

  for (let i = 0; i < data.length; i += 4) {
    const value = data[i + channelIndex];
    histogram[value]++;
  }

  return histogram;
}

/** Создает гистограммы R, G и B из imageData. */
export function getRGBHistograms(imageData: ImageData) {
  const { data } = imageData;
  const r = new Array(256).fill(0);
  const g = new Array(256).fill(0);
  const b = new Array(256).fill(0);

  for (let i = 0; i < data.length; i += 4) {
    r[data[i]]++;
    g[data[i + 1]]++;
    b[data[i + 2]]++;
  }

  return { r, g, b };
}

/**
 * Создает гистограмму градаций серого, усредняя R, G и B.
 */
export function getGrayscaleHistogram(imageData: ImageData): number[] {
  const histogram = new Array(256).fill(0);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const gray = Math.round((data[i] + data[i + 1] + data[i + 2]) / 3);
    histogram[gray]++;
  }

  return histogram;
}

/** Создает гистограмму альфа-канала из imageData. */
export function getAlphaHistogram(imageData: ImageData): number[] {
  const histogram = new Array(256).fill(0);
  const data = imageData.data;
  const length = data.length;

  for (let i = 3; i < length; i += 4) {
    const alpha = data[i]; // A-канал
    histogram[alpha]++;
  }

  return histogram;
}
