export async function resizeImageByMethod(
  src: ImageData | null,
  newWidth: number,
  newHeight: number,
  method: "nearest" | "bilinear",
): Promise<ImageData | null> {
  if (!src) {
    alert("Изображение не загружено");
    return src;
  }

  if (newWidth <= 0 || newHeight <= 0) {
    alert("Неверные размеры изображения");
    return src;
  }

  if (src.width === newWidth && src.height === newHeight) {
    alert("Размер изображения не изменился");
    return src;
  }

  switch (method) {
    case "nearest":
      return await resizeNearestNeighbor(src, newWidth, newHeight);
    case "bilinear":
      return await resizeBilinear(src, newWidth, newHeight);
  }
}

export async function resizeNearestNeighbor(
  src: ImageData,
  newWidth: number,
  newHeight: number,
): Promise<ImageData> {
  const srcWidth = src.width;
  const srcHeight = src.height;
  const srcData = src.data;

  const dest = new ImageData(newWidth, newHeight);
  const destData = dest.data;

  for (let y = 0; y < newHeight; y++) {
    for (let x = 0; x < newWidth; x++) {
      const srcX = Math.round((x / newWidth) * srcWidth);
      const srcY = Math.round((y / newHeight) * srcHeight);

      const srcIndex =
        (Math.min(srcY, srcHeight - 1) * srcWidth +
          Math.min(srcX, srcWidth - 1)) *
        4;
      const destIndex = (y * newWidth + x) * 4;

      destData[destIndex + 0] = srcData[srcIndex + 0];
      destData[destIndex + 1] = srcData[srcIndex + 1];
      destData[destIndex + 2] = srcData[srcIndex + 2];
      destData[destIndex + 3] = srcData[srcIndex + 3];
    }
  }

  return dest;
}

export async function resizeBilinear(
  src: ImageData,
  newWidth: number,
  newHeight: number,
): Promise<ImageData> {
  const srcWidth = src.width;
  const srcHeight = src.height;
  const srcData = src.data;

  const dest = new ImageData(newWidth, newHeight);
  const destData = dest.data;

  for (let y = 0; y < newHeight; y++) {
    const srcY = (y / newHeight) * (srcHeight - 1);
    const y0 = Math.floor(srcY);
    const y1 = Math.min(y0 + 1, srcHeight - 1);
    const yLerp = srcY - y0;

    for (let x = 0; x < newWidth; x++) {
      const srcX = (x / newWidth) * (srcWidth - 1);
      const x0 = Math.floor(srcX);
      const x1 = Math.min(x0 + 1, srcWidth - 1);
      const xLerp = srcX - x0;

      const i00 = (y0 * srcWidth + x0) * 4;
      const i10 = (y0 * srcWidth + x1) * 4;
      const i01 = (y1 * srcWidth + x0) * 4;
      const i11 = (y1 * srcWidth + x1) * 4;

      const destIndex = (y * newWidth + x) * 4;

      for (let c = 0; c < 4; c++) {
        const top = srcData[i00 + c] * (1 - xLerp) + srcData[i10 + c] * xLerp;
        const bottom =
          srcData[i01 + c] * (1 - xLerp) + srcData[i11 + c] * xLerp;
        destData[destIndex + c] = top * (1 - yLerp) + bottom * yLerp;
      }
    }
  }

  return dest;
}
