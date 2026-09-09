type Kernel = number[][]; // 3x3

export function applyConvolution(
  imageData: ImageData,
  kernel: Kernel,
  applyTo: "rgb" | "alpha" = "rgb",
): ImageData {
  const { width, height, data } = imageData;
  const result = new Uint8ClampedArray(data.length);

  const getPixel = (x: number, y: number, c: number): number => {
    // edge handling: replicate border
    x = Math.max(0, Math.min(width - 1, x));
    y = Math.max(0, Math.min(height - 1, y));
    return data[(y * width + x) * 4 + c];
  };

  const normalize = kernel.flat().reduce((a, b) => a + b, 0) || 1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const baseIndex = (y * width + x) * 4;

      if (applyTo === "rgb") {
        // фильтруем R, G, B
        for (let c = 0; c < 3; c++) {
          let acc = 0;
          for (let ky = 0; ky < 3; ky++) {
            for (let kx = 0; kx < 3; kx++) {
              const px = x + kx - 1;
              const py = y + ky - 1;
              acc += getPixel(px, py, c) * kernel[ky][kx];
            }
          }
          result[baseIndex + c] = Math.min(255, Math.max(0, acc / normalize));
        }
        // копируем альфа-канал без изменений
        result[baseIndex + 3] = getPixel(x, y, 3);
      } else if (applyTo === "alpha") {
        // копируем RGB без изменений
        for (let c = 0; c < 3; c++) {
          result[baseIndex + c] = getPixel(x, y, c);
        }
        // фильтруем только альфа
        let acc = 0;
        for (let ky = 0; ky < 3; ky++) {
          for (let kx = 0; kx < 3; kx++) {
            const px = x + kx - 1;
            const py = y + ky - 1;
            acc += getPixel(px, py, 3) * kernel[ky][kx];
          }
        }
        result[baseIndex + 3] = Math.min(255, Math.max(0, acc / normalize));
      }
    }
  }

  return new ImageData(result, width, height);
}

export const ConvolutionPresets: Record<string, Kernel> = {
  Identity: [
    [0, 0, 0],
    [0, 1, 0],
    [0, 0, 0],
  ],
  Sharpen: [
    [0, -1, 0],
    [-1, 5, -1],
    [0, -1, 0],
  ],
  "Gaussian Blur": [
    [1, 2, 1],
    [2, 4, 2],
    [1, 2, 1],
  ],
  "Box Blur": [
    [1, 1, 1],
    [1, 1, 1],
    [1, 1, 1],
  ],
  "Prewitt Horizontal": [
    [-1, 0, 1],
    [-1, 0, 1],
    [-1, 0, 1],
  ],
  "Prewitt Vertical": [
    [-1, -1, -1],
    [0, 0, 0],
    [1, 1, 1],
  ],
};
